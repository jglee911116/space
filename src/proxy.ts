import { NextResponse, type NextRequest } from 'next/server';
import { legacyDestination } from '@/i18n/routing';

export function proxy(request: NextRequest) {
  return NextResponse.redirect(legacyDestination(request.nextUrl));
}

export const config = {
  matcher: ['/', '/explore/:path*', '/galaxies/:path*', '/superclusters/:path*', '/universe', '/local-group'],
};
