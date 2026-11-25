'use client';

import { Message } from '@/i18n/language';
import dynamic from 'next/dynamic';
import styles from './explore.module.scss';

const Explorer = dynamic(
  () => {
    // 첫 화면(/ko, /en)은 태양계 이웃 지도라 Explorer 와 함께 장면 청크도 바로 받아 왕복 한 번을 줄인다.
    if (/^\/[a-z]{2}\/?$/.test(window.location.pathname) && !window.location.search) void import('./scenes/neighborhood-scene');
    return import('./explorer/explorer').then(({ Explorer }) => Explorer);
  },
  {
    ssr: false,
    // ssr:false 의 dynamic 은 자체 Suspense 경계를 두므로 바깥 Suspense fallback 은 보이지 않는다 — 안내는 loading 으로.
    loading: () => (
      <p className={styles.status} role="status">
        <Message id="canvas.loadingViewer" />
      </p>
    ),
  },
);

export function ExplorePage() {
  return (
    <main className={styles.explore}>
      <Explorer />
    </main>
  );
}
