'use client';

import { Message } from '@/i18n/language';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import type { StarSystem } from '@/constants/space';
import styles from './explore.module.scss';

const Explorer = dynamic(() => import('./explorer').then(({ Explorer }) => Explorer), { ssr: false });

export function ExplorePage({ systems }: { systems: readonly StarSystem[] }) {
  return (
    <main className={styles.explore}>
      <Suspense
        fallback={
          <p role="status">
            <Message id="canvas.loadingViewer" />
          </p>
        }
      >
        <Explorer systems={systems} />
      </Suspense>
    </main>
  );
}
