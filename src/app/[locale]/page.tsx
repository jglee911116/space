import { getLocale } from '@/i18n/server';
import { translate } from '@/i18n/messages';
import type { Metadata } from 'next';
import { milkyWay } from '@/constants/space';

// 쿼리 없는 첫 화면은 태양계 이웃 지도 — 클라이언트가 바꾸는 document.title 과 맞춘다.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: translate(await getLocale(params), milkyWay.neighborhood.name) };
}

export default function Page() {
  return null;
}
