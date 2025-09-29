import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED = ['tr', 'en'] as const;
const DEFAULT_LOCALE = 'tr';

function pickLocale(req: NextRequest): 'tr' | 'en' {
  const cookie = req.cookies.get('LOCALE')?.value as 'tr' | 'en' | undefined;
  if (cookie === 'tr' || cookie === 'en') return cookie;
  const header = req.headers.get('accept-language') || '';
  const langs = header.split(',').map(s => s.split(';')[0].trim().toLowerCase());
  for (const l of langs) {
    const base = (l.split('-')[0] || '').toLowerCase();
    if ((SUPPORTED as readonly string[]).includes(base)) return base as 'tr' | 'en';
  }
  return DEFAULT_LOCALE as 'tr';
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Ignore API and static
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }
  const locale = pickLocale(req);
  const res = NextResponse.next();
  // Set/refresh cookie without redirecting or changing path
  res.cookies.set('LOCALE', locale, { path: '/', httpOnly: false, sameSite: 'lax' });
  return res;
}

export const config = {
  matcher: ['/((?!_next|api).*)']
};


