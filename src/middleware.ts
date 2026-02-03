import { NextResponse, type NextRequest } from 'next/server';
import { checkSession } from '@/lib/supabase/middleware';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard'];
const ADMIN_ROUTES = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { hasAuthCookie, response } = checkSession(request);

  // Protected routes: redirect to login if not authenticated
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));

  if ((isProtectedRoute || isAdminRoute) && !hasAuthCookie) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
