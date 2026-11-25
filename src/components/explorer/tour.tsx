import { useLanguage } from '@/i18n/language';
import type { CatalogText, MessageKey } from '@/i18n/messages';
import { localGroup, milkyWay, observableUniverse, superclusters, systems } from '@/constants/space';
import { useState } from 'react';
import { galaxyPath, localGroupPath, neighborhoodPath, superclusterPath, systemPath, UNIVERSE_PATH } from '../utils/paths';
import styles from '../explore.module.scss';

/** 항성계에서 관측 가능한 우주까지, 포함 관계를 따라 한 단계씩 넓혀 간다. */
const steps: readonly { path: string; caption: MessageKey; name: CatalogText }[] = [
  { path: systemPath(milkyWay.id, systems[0].id), caption: 'tour.system', name: systems[0].name },
  { path: neighborhoodPath(), caption: 'tour.neighborhood', name: milkyWay.neighborhood.name },
  { path: galaxyPath(milkyWay.id), caption: 'tour.galaxy', name: milkyWay.name },
  { path: localGroupPath(milkyWay.id), caption: 'tour.localGroup', name: localGroup.name },
  ...superclusters.map((item) => ({ path: superclusterPath(item.id), caption: 'tour.supercluster' as const, name: item.name })),
  { path: UNIVERSE_PATH, caption: 'tour.universe', name: observableUniverse.name },
];

export function Tour({ currentPath, navigateSpace }: { currentPath: string; navigateSpace: (url: string) => void }) {
  const { t, catalogText } = useLanguage();
  const [step, setStep] = useState<number | null>(null);
  const go = (next: number) => {
    setStep(next);
    navigateSpace(steps[next].path);
  };
  // 둘러보기 밖으로(찾기·확대·뒤로) 옮겨 가면 끝낸다. 주소가 바뀐 순간에만 비교한다(이동 직후 한 프레임은 아직 이전 주소다).
  const [seenPath, setSeenPath] = useState(currentPath);
  if (seenPath !== currentPath) {
    setSeenPath(currentPath);
    if (step !== null && steps[step].path !== currentPath) setStep(null);
  }
  if (step === null) {
    return (
      <button type="button" onClick={() => go(0)}>
        {t('tour.start')}
      </button>
    );
  }
  const current = steps[step];
  return (
    <section className={styles.tour} aria-label={t('tour.start')}>
      <p role="status">
        <strong>
          {t('tour.progress', [String(step + 1), String(steps.length)])} · {catalogText(current.name)}
        </strong>{' '}
        {t(current.caption)}
      </p>
      <div>
        <button type="button" disabled={step === 0} onClick={() => go(step - 1)}>
          {t('tour.previous')}
        </button>
        {step < steps.length - 1 && (
          <button type="button" onClick={() => go(step + 1)}>
            {t('tour.next')}
          </button>
        )}
        <button type="button" onClick={() => setStep(null)}>
          {t('tour.end')}
        </button>
      </div>
    </section>
  );
}
