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
  const compact = new Intl.NumberFormat(intl, { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 });
  const measurement = (value: number, koreanDivisor: number, koreanDigits = 1) => (locale === 'ko' ? number(value / koreanDivisor, koreanDigits) : compact.format(value));
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
