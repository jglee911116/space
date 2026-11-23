import type { Metadata } from 'next';
import Link from 'next/link';
import '@/styles/globals.scss';
import styles from './global-not-found.module.scss';
import { SITE_NAME_KEY } from '@/constants/site';
import { translate } from '@/i18n/messages';

// 로케일을 알 수 없는 주소에서도 쓰이므로 두 언어를 함께 보여 준다.
export const metadata: Metadata = { title: `404 · ${translate('ko', SITE_NAME_KEY)} / ${translate('en', SITE_NAME_KEY)}`, robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <html lang="ko">
      <body>
        <main className={styles.notFound}>
          <h1>404</h1>
          <p lang="ko">찾는 페이지가 없습니다.</p>
          <p lang="en">This page could not be found.</p>
          <nav>
            <Link href="/ko">{translate('ko', SITE_NAME_KEY)} 처음 화면</Link>
            <Link href="/en" lang="en">{translate('en', SITE_NAME_KEY)} home</Link>
          </nav>
        </main>
      </body>
    </html>
  );
}
