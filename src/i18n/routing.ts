import { defaultLocale, languages, type Locale } from './messages';

export const localeCodes = Object.keys(languages) as Locale[];

export function isLocale(value: string | null): value is Locale {
  return value !== null && Object.hasOwn(languages, value);
}

export function withLocale(path: string, locale: Locale) {
  const suffix = path === '/' || path.startsWith('/?') ? path.slice(1) : path;
  return `/${locale}${suffix}`;
}

export function withoutLocale(pathname: string) {
  const [, segment] = pathname.split('/', 2);
  return segment && isLocale(segment) ? pathname.slice(segment.length + 1) || '/' : pathname;
}

/** Accept-Language 에서 지원하는 첫 언어(q 값 순서는 헤더 순서를 따른다고 본다). */
export function preferredLocale(acceptLanguage: string | null) {
  const tags = acceptLanguage?.split(',').map((part) => part.split(';')[0].trim().split('-')[0].toLowerCase()) ?? [];
  return tags.find((tag): tag is Locale => isLocale(tag)) ?? defaultLocale;
}

export function legacyDestination(current: URL, acceptLanguage: string | null = null) {
  const next = new URL(current);
  const requested = next.searchParams.get('lang');
  const locale = isLocale(requested) ? requested : preferredLocale(acceptLanguage);
  const path = next.pathname.replace(/^\/explore(?=\/|$)/, '') || '/';
  next.pathname = withLocale(path, locale);
  next.searchParams.delete('lang');
  return next;
}
