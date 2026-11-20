'use client';

import { useLanguage } from '@/i18n/language';
import { Component, type ReactNode } from 'react';
import styles from '../explore.module.scss';

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
