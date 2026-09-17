import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/dependencies',
  '/infrastructure',
  '/logs',
  '/metrics',
  '/service-map',
  '/services',
  '/traces',
  '/deployments',
  '/ai-investigation',
  '/incidents',
  '/alerts',
  '/monitors',
  '/slo-sla',
  '/integrations',
  '/api-keys',
  '/team',
  '/audit-logs',
  '/settings',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) =>
      pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!isProtectedRoute) {
  const accessToken = request.cookies.get('nexus_access_token')?.value;

  if (pathname === '/login' && accessToken) {
    return NextResponse.redirect(
      new URL('/dashboard', request.url),
    );
  }

  return NextResponse.next();
}

  const accessToken = request.cookies.get('nexus_access_token')?.value;

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dependencies/:path*',
    '/infrastructure/:path*',
    '/logs/:path*',
    '/metrics/:path*',
    '/service-map/:path*',
    '/services/:path*',
    '/traces/:path*',
    '/deployments/:path*',
    '/ai-investigation/:path*',
    '/incidents/:path*',
    '/alerts/:path*',
    '/monitors/:path*',
    '/slo-sla/:path*',
    '/integrations/:path*',
    '/api-keys/:path*',
    '/team/:path*',
    '/audit-logs/:path*',
    '/settings/:path*',
  ],
};
