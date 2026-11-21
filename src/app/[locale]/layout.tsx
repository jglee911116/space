import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.scss';
import { ExplorePage } from '@/components/explore/explore-page';
import { validateCatalog } from '@/components/explore/utils/validate-catalog';
import { SITE_NAME_KEY } from '@/constants/site';
import { LanguageProvider } from '@/i18n/language';
import { translate } from '@/i18n/messages';
import { localeCodes } from '@/i18n/routing';
import { getLocale } from '@/i18n/server';

type Props = { params: Promise<{ locale: string }>; children: ReactNode };

export const dynamicParams = false;

export function generateStaticParams() {
  validateCatalog();
  return localeCodes.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await getLocale(params);
  const siteName = translate(locale, SITE_NAME_KEY);
  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    description: translate(locale, 'site.description'),
  };
}

export default async function RootLayout({ params, children }: Props) {
  const locale = await getLocale(params);
  return (
    <html lang={locale}>
      <body>
        <LanguageProvider locale={locale}>
          {/* 모든 페이지가 같은 탐색기를 쓴다 — 레이아웃에 두어 경로가 바뀌어도 3D 장면이 다시 마운트되지 않는다. page 는 메타데이터만. */}
          <ExplorePage />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
