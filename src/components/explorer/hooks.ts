import { useLanguage } from '@/i18n/language';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { distanceScale } from '../utils/distance-scale';
import { elapsedSimulationDays, REALTIME_DAYS_PER_SECOND } from '../utils/orbit';

const infoMediaQuery = '(max-width: 560px)';

function subscribeToInfoMedia(change: () => void) {
  const media = window.matchMedia(infoMediaQuery);
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}

/** 정보 패널 열림 상태 — 좁은 화면은 닫힌 채, 넓은 화면은 연 채 시작하고 사용자의 선택은 지금 보는 화면에만 적용한다. */
export function useInfoPanel(viewKey: string) {
  const infoId = useId();
  const infoButton = useRef<HTMLButtonElement>(null);
  const compactInfo = useSyncExternalStore(
    subscribeToInfoMedia,
    () => window.matchMedia(infoMediaQuery).matches,
    () => false,
  );
  const [infoChoice, setInfoChoice] = useState<{ viewKey: string; open: boolean }>();
  const infoPreference = infoChoice?.viewKey === viewKey ? infoChoice.open : undefined;
  const setInfoPreference = (open: boolean) => setInfoChoice({ viewKey, open });
  const closeInfo = () => {
    setInfoPreference(false);
    infoButton.current?.focus();
  };
  return { infoId, infoButton, infoOpen: infoPreference ?? !compactInfo, infoPreference, setInfoPreference, closeInfo };
}

/** 공전 시계와 강착 흐름 재생 시간 — 장면들이 ref 로 읽어 렌더 없이 움직인다. */
export function usePlayback() {
  // 동작 줄이기 설정이면 공전을 멈춘 채 시작한다(Explorer 는 ssr:false 라 window 를 바로 읽는다).
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [galacticDemo, setGalacticDemo] = useState(false);
  // 부호가 방향(음수는 거꾸로), 크기가 초당 날수. 장면의 시각 효과는 크기만 쓰고 시뮬레이션 시계만 방향을 따른다.
  const [speed, setSpeed] = useState(REALTIME_DAYS_PER_SECOND);
  const daysPerSecond = Math.abs(speed);
  const direction = Math.sign(speed);
  // 시뮬레이션 시계가 0 에서 출발한 순간(이 브라우저 시계 기준).
  const [startedAt] = useState(() => Date.now());
  const simulationDaysRef = useRef(0);
  const accretionPlaybackTime = useRef(0);
  useEffect(() => {
    if (paused) return;
    const accretionRate = Math.max(0.18, 1 + 0.32 * Math.log10(daysPerSecond / REALTIME_DAYS_PER_SECOND));
    let previous = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const seconds = Math.max(0, now - previous) / 1000;
      simulationDaysRef.current += direction * elapsedSimulationDays(seconds, daysPerSecond);
      accretionPlaybackTime.current += Math.min(seconds, 0.1) * accretionRate;
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [daysPerSecond, direction, paused]);
  /** 시뮬레이션 시계를 시작 시점에서 days 만큼 떨어진 순간으로 옮긴다(날짜 이동). */
  const jumpToDays = useCallback((days: number) => {
    simulationDaysRef.current = days;
  }, []);
  /** 지금 시뮬레이션 날수(이벤트 처리기에서 읽는다). */
  const readDays = useCallback(() => simulationDaysRef.current, []);
  return { paused, setPaused, galacticDemo, setGalacticDemo, speed, setSpeed, daysPerSecond, startedAt, jumpToDays, readDays, simulationDaysRef, accretionPlaybackTime };
}

export type Playback = Omit<ReturnType<typeof usePlayback>, 'simulationDaysRef' | 'accretionPlaybackTime'>;

/** 화면 거리 축척 막대 — 장면이 매 프레임 알려 주는 축척을 DOM 에 직접 써 React 렌더를 피한다. */
export function useDistanceBar() {
  const { t, locale, number } = useLanguage();
  const distanceBar = useRef<HTMLDivElement>(null);
  const reportDistance = useCallback(
    (kmPerPixel: number) => {
      const bar = distanceBar.current;
      if (!bar || !Number.isFinite(kmPerPixel) || kmPerPixel <= 0) return;
      const { label, pixels } = distanceScale(kmPerPixel, locale, number);
      const text = t('navigation.sceneScaleValue', [label]);
      if (bar.textContent !== text) bar.textContent = text;
      const width = `${pixels}px`;
      if (bar.style.getPropertyValue('--scale-width') !== width) bar.style.setProperty('--scale-width', width);
    },
    [locale, number, t],
  );
  return { distanceBar, reportDistance };
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

/** 서버 시계와 이 브라우저 시계의 차(ms). 받기 전이나 실패하면 0 — 브라우저 시계를 쓴다. */
export function useServerClockOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const sent = Date.now();
    fetch('/api/time', { cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { now?: unknown } | null) => {
        // 왕복 시간의 절반만큼 늦게 도착했다고 보고 보정한다.
        if (typeof body?.now === 'number' && Number.isFinite(body.now)) setOffset(body.now - (sent + Date.now()) / 2);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return offset;
}
