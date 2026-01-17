import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

function isPublicRoute(pathname: string) {
  if (pathname === '/') return true;
  if (pathname.startsWith('/sign-in')) return true;
  if (pathname.startsWith('/sign-up')) return true;
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname === '/api/auth-test') return true;
  return false;
}

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Don't redirect API routes; they should handle 401s themselves.
  if (pathname.startsWith('/api/')) return NextResponse.next();

  if (isPublicRoute(pathname)) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const redirectUrl = `${pathname}${search || ''}`;
    const url = new URL(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`, request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
