'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { defaultLocale, languages, translate, type FormatNumber, type Locale, type CatalogText, type Interpolation, type MessageKey } from './messages';

function createLanguage(locale: Locale) {
  const intl = languages[locale].intl;
  const formats = new Map<number, Intl.NumberFormat>();
  const number: FormatNumber = (value, digits = 1) => {
    let format = formats.get(digits);
    if (!format) {
      format = new Intl.NumberFormat(intl, { maximumFractionDigits: digits });
      formats.set(digits, format);
    }
    return format.format(value);
  };
  // 큰 수는 언어별 단위(억·만 / million·billion)를 Intl 이 고른다 — 문구에 단위를 박지 않는다.
  const compact = new Intl.NumberFormat(intl, { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1, useGrouping: true });
  const measurement = (value: number) => compact.format(value);
  return {
    locale,
    number,
    measurement,
    t: (key: MessageKey, values?: readonly Interpolation[]) => translate(locale, key, values),
    catalogText: (value: CatalogText) => translate(locale, value),
  };
}

const LanguageContext = createContext(createLanguage(defaultLocale));

export function LanguageProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const language = useMemo(() => createLanguage(locale), [locale]);
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function Message({ id }: { id: MessageKey }) {
  const { t } = useLanguage();
  return t(id);
}
