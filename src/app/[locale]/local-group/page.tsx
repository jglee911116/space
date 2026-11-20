import { getLocale } from '@/i18n/server';
import { translate } from '@/i18n/messages';
import type { Metadata } from 'next';
import { localGroup } from '@/constants/space';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: translate(await getLocale(params), localGroup.name) };
}

export default function Page() {
  return null;
}
