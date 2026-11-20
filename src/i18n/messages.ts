import en from './en.json';
import ko from './ko.json';

export type MessageKey = keyof typeof ko;
type Dictionary = Record<MessageKey, string>;
export type Interpolation = string | number;
type MessageReference = { readonly key: MessageKey; readonly values: readonly Interpolation[] };

export type CatalogText = string | MessageReference;
export type Translator = (key: MessageKey, values?: readonly Interpolation[]) => string;
export type FormatNumber = (value: number, digits?: number) => string;

export const defaultLocale = 'ko';
export const languages = {
  ko: { name: '한국어', intl: 'ko-KR', messages: ko },
  en: { name: 'English', intl: 'en-US', messages: en },
} satisfies Record<string, { name: string; intl: string; messages: Dictionary }>;

export type Locale = keyof typeof languages;

export function message(key: MessageKey, ...values: Interpolation[]): MessageReference {
  return { key, values };
}

export function translate(locale: Locale, text: CatalogText, values: readonly Interpolation[] = []) {
  const key = typeof text === 'string' ? text : text.key;
  const messages: Dictionary = languages[locale].messages;
  if (!Object.hasOwn(messages, key)) return key;
  const args = typeof text === 'string' ? values : text.values;
  return messages[key as MessageKey].replace(/\{(\d+)\}/g, (placeholder, index: string) => (args[Number(index)] ?? placeholder).toString());
}
