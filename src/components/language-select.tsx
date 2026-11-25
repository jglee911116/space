'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef } from 'react';
import { useLanguage } from '@/i18n/language';
import { languages } from '@/i18n/messages';
import { localeCodes, withLocale, withoutLocale } from '@/i18n/routing';
import styles from './explore.module.scss';

export function LanguageSelect() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const currentLanguage = languages[locale].name;

  return (
    <>
      <button className={`${styles.exploreTrigger} ${styles.languageTrigger}`} type="button" popoverTarget={menuId} aria-label={`${t('settings.language')} ${currentLanguage}`}>
        <span lang={locale}>{currentLanguage}</span>
      </button>
      <div ref={menu} id={menuId} popover="auto" className={`${styles.exploreMenu} ${styles.languageMenu}`} role="group" aria-label={t('settings.language')}>
        <div className={styles.controls}>
          {localeCodes.map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={code === locale}
              onClick={() => {
                menu.current?.hidePopover();
                if (code === locale) return;
                const url = new URL(window.location.href);
                url.pathname = withLocale(withoutLocale(url.pathname), code);
                url.searchParams.delete('lang');
                router.push(url.pathname + url.search + url.hash, { scroll: false });
              }}
            >
              {languages[code].name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
