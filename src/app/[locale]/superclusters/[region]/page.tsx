import { getLocale } from '@/i18n/server';
import { translate } from '@/i18n/messages';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { superclusters } from '@/constants/space';

type Props = { params: Promise<{ locale: string; region: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return superclusters.map(({ id }) => ({ region: id }));
}

async function getRegion(params: Props['params']) {
  const { region } = await params;
  return superclusters.find(({ id }) => id === region) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: translate(await getLocale(params), (await getRegion(params)).name) };
}

export default async function Page({ params }: Props) {
  await getRegion(params);
  return null;
}
