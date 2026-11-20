import { translate } from '@/i18n/messages';
import { observableUniverse } from '@/constants/space';
import { getLocale } from '@/i18n/server';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: translate(await getLocale(params), observableUniverse.name) };
}

export default function Page() {
  return null;
}
