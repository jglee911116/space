'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/i18n/language';
import { languages } from '@/i18n/messages';
import { isLocale, localeCodes, withLocale, withoutLocale } from '@/i18n/routing';
import styles from './explore.module.scss';

export function LanguageSelect() {
  const { locale, t } = useLanguage();
  const router = useRouter();

  return (
    <span className={styles.languageField}>
      <select
        className={styles.language}
        aria-label={t('settings.language')}
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value;
          if (!isLocale(nextLocale) || nextLocale === locale) return;
          const url = new URL(window.location.href);
          url.pathname = withLocale(withoutLocale(url.pathname), nextLocale);
          url.searchParams.delete('lang');
          router.push(url.pathname + url.search + url.hash, { scroll: false });
        }}
      >
        {localeCodes.map((code) => (
          <option key={code} value={code} lang={code}>
            {languages[code].name}
          </option>
        ))}
      </select>
    </span>
  );
}
