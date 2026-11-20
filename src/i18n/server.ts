import { notFound } from 'next/navigation';
import { isLocale } from './routing';

export async function getLocale(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}
