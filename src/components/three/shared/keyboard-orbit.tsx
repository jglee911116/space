import type { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type ComponentRef } from 'react';
import { MathUtils } from 'three';

type Controls = ComponentRef<typeof OrbitControls>;
type Action = 'left' | 'right' | 'up' | 'down' | 'in' | 'out';

const ROTATE_RADIANS_PER_SECOND = Math.PI / 2;
// 휠 한 칸 배율(getZoomScale)을 초당 이만큼 적용한다 — 장면마다 다른 zoomSpeed 를 그대로 따른다.
const ZOOM_STEPS_PER_SECOND = 12;
// 프레임 사이에 눌렀다 뗀 키(화면 키보드·음성 제어 같은 보조 입력)도 이만큼은 움직인다(약 9° 또는 휠 1.2칸).
const TAP_SECONDS = 0.1;
const POLE_MARGIN = 0.05;
// 방향키를 스스로 쓰는 입력 요소와 팝오버(검색·언어 메뉴) 안에서는 카메라를 움직이지 않는다.
const OWNS_ARROW_KEYS = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [popover], [role="listbox"], [role="menu"], [role="radiogroup"], [role="slider"], [role="tablist"]';

// 휠·드래그가 보내는 것과 같은 start/end 신호(target 은 dispatchEvent 가 다시 채운다).
const startGesture = (orbit: Controls) => orbit.dispatchEvent({ type: 'start', target: orbit });
const endGesture = (orbit: Controls) => orbit.dispatchEvent({ type: 'end', target: orbit });

function actionOf(event: KeyboardEvent): Action | undefined {
  if (event.key === 'ArrowLeft') return 'left';
  if (event.key === 'ArrowRight') return 'right';
  if (event.key === 'ArrowUp') return event.shiftKey ? 'in' : 'up';
  if (event.key === 'ArrowDown') return event.shiftKey ? 'out' : 'down';
  if (event.key === '+' || event.key === '=') return 'in';
  if (event.key === '-' || event.key === '_') return 'out';
}

function popoverOpen() {
  try {
    return document.querySelector(':popover-open') !== null;
  } catch {
    return false;
  }
}

// 정보 패널·목록처럼 세로로 스크롤되는 곳(문서 자체는 제외)에서는 ↑↓ 를 스크롤에 남긴다.
function scrollsVertically(element: Element | null) {
  for (let node = element; node && node !== document.body; node = node.parentElement) {
    if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) return true;
  }
  return false;
}

/**
 * 키보드 시점 조작 — 화살표는 보고 있는 천체 둘레로 시점을 옮기고, +/−·Shift+↑↓ 는 확대·축소한다.
 * 장면의 기본 OrbitControls(makeDefault)를 움직이고, 드래그·핀치처럼 키를 누를 때 start, 모두 뗄 때 end 를 보내
 * 축소해 상위 지도로 넘어가는 장면들의 onStart/onEnd 로직이 그대로 동작한다.
 */
export function KeyboardOrbitControls() {
  const controls = useThree((state) => state.controls) as Controls | null;
  // 물리 키(event.code)별 동작 — 자판 배열이나 Shift 를 떼는 순서와 상관없이 그 키를 떼면 풀린다.
  const held = useRef(new Map<string, Action>());
  const tapped = useRef(new Set<Action>());
  const gesture = useRef<Controls | null>(null);
  const goal = useRef<{ theta: number; phi: number } | null>(null);

  useEffect(() => {
    const keys = held.current;
    const taps = tapped.current;
    // 클릭으로는 포커스가 안 가는 패널 글자를 누른 뒤엔 keydown 대상이 body 라, 마지막으로 누른 곳을 기준으로 본다.
    let pointerOrigin: Element | null = null;
    const onPointerDown = (event: PointerEvent) => {
      pointerOrigin = event.target instanceof Element ? event.target : null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const action = actionOf(event);
      if (!action || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || popoverOpen()) return;
      const origin = event.target instanceof Element && event.target !== document.body ? event.target : pointerOrigin;
      if (origin?.closest(OWNS_ARROW_KEYS)) return;
      if ((action === 'up' || action === 'down') && scrollsVertically(origin)) return;
      event.preventDefault();
      keys.set(event.code, action);
      taps.add(action);
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const releaseAll = () => {
      keys.clear();
      taps.clear();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      releaseAll();
    };
  }, []);

  useFrame((_, delta) => {
    const keys = held.current;
    const taps = tapped.current;
    const orbit = controls?.enabled ? controls : null;
    if (!orbit || (keys.size === 0 && taps.size === 0)) {
      if (gesture.current) endGesture(gesture.current);
      gesture.current = null;
      goal.current = null;
      taps.clear();
      return;
    }
    const active = new Set([...keys.values(), ...taps]);
    taps.clear();
    if (gesture.current !== orbit) {
      if (gesture.current) endGesture(gesture.current);
      gesture.current = orbit;
      goal.current = null;
      startGesture(orbit);
    }
    const step = keys.size > 0 ? Math.min(delta, 0.1) : TAP_SECONDS;
    const turn = Number(active.has('right')) - Number(active.has('left'));
    const tilt = Number(active.has('down')) - Number(active.has('up'));
    const zoom = Number(active.has('out')) - Number(active.has('in'));
    if ((turn || tilt) && orbit.enableRotate) {
      // 목표 각도를 일정한 속도로 옮기고 감쇠(damping)가 따라가게 해 드래그처럼 부드럽게 돌고 멈춘다.
      goal.current ??= { theta: orbit.getAzimuthalAngle(), phi: orbit.getPolarAngle() };
      goal.current.theta += turn * ROTATE_RADIANS_PER_SECOND * step;
      const minPhi = Math.max(orbit.minPolarAngle, POLE_MARGIN);
      const maxPhi = Math.min(orbit.maxPolarAngle, Math.PI - POLE_MARGIN);
      goal.current.phi = MathUtils.clamp(goal.current.phi + tilt * ROTATE_RADIANS_PER_SECOND * step, minPhi, maxPhi);
      orbit.setAzimuthalAngle(goal.current.theta);
      orbit.setPolarAngle(goal.current.phi);
    } else {
      goal.current = null;
    }
    if (zoom && orbit.enableZoom) {
      const scale = orbit.getZoomScale() ** (ZOOM_STEPS_PER_SECOND * step);
      if (zoom < 0) orbit.dollyIn(scale);
      else orbit.dollyOut(scale);
    }
  });

  return null;
}
