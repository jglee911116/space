'use client';

import { Message } from '@/i18n/language';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import styles from './explore.module.scss';

const Explorer = dynamic(
  () => {
    // 첫 화면(/ko, /en)은 태양계 이웃 지도라 Explorer 와 함께 장면 청크도 바로 받아 왕복 한 번을 줄인다.
    if (/^\/[a-z]{2}\/?$/.test(window.location.pathname) && !window.location.search) void import('./scenes/neighborhood-scene');
    return import('./explorer').then(({ Explorer }) => Explorer);
  },
  { ssr: false },
);

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
