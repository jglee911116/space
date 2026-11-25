'use client';

import { useLanguage } from '@/i18n/language';
import { Component, type ReactNode } from 'react';
// 모든 장면이 CanvasBoundary 를 거치므로 첫 Canvas 보다 먼저 three 콘솔 필터가 설치된다.
import './three-console';
import styles from '../../explore.module.scss';

function Unavailable() {
  const { t } = useLanguage();
  return (
    <p className={styles.status} role="status">
      {t('canvas.unavailable')}
    </p>
  );
}

export class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <Unavailable /> : this.props.children;
  }
}
