import { getLocale } from '@/i18n/server';
import { translate } from '@/i18n/messages';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { galaxies } from '@/constants/space';

type Props = { params: Promise<{ locale: string; galaxy: string }> };

export function generateStaticParams() {
  return galaxies.map(({ id }) => ({ galaxy: id }));
}

export const dynamicParams = false;

async function getGalaxy(params: Props['params']) {
  const { galaxy } = await params;
  return galaxies.find(({ id }) => id === galaxy) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const galaxy = await getGalaxy(params);
  return { title: translate(await getLocale(params), galaxy.name) };
}

export default async function Page({ params }: Props) {
  await getGalaxy(params);
  return null;
}
