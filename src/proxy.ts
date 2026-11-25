import { NextResponse, type NextRequest } from 'next/server';
import { legacyDestination } from '@/i18n/routing';

export function proxy(request: NextRequest) {
  // ?lang 이 있으면 목적지가 정해져 있어 영구(308), 없으면 브라우저 언어에 따라 달라지므로 임시(307).
  const permanent = request.nextUrl.searchParams.has('lang');
  return NextResponse.redirect(legacyDestination(request.nextUrl, request.headers.get('accept-language')), permanent ? 308 : 307);
}

export const config = {
  matcher: ['/', '/galaxies/:path*', '/superclusters/:path*', '/universe', '/local-group'],
};
