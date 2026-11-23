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

export function legacyDestination(current: URL) {
  const next = new URL(current);
  const requested = next.searchParams.get('lang');
  const locale = isLocale(requested) ? requested : defaultLocale;
  const path = next.pathname.replace(/^\/explore(?=\/|$)/, '') || '/';
  next.pathname = withLocale(path, locale);
  next.searchParams.delete('lang');
  return next;
}
