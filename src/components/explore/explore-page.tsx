'use client';

import { Message } from '@/i18n/language';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import styles from './explore.module.scss';

const Explorer = dynamic(() => import('./explorer').then(({ Explorer }) => Explorer), { ssr: false });

export function ExplorePage() {
  return (
    <main className={styles.explore}>
      <Suspense
        fallback={
          <p role="status">
            <Message id="canvas.loadingViewer" />
          </p>
        }
      >
        <Explorer />
      </Suspense>
    </main>
  );
}
