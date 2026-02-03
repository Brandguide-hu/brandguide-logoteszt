import { NextResponse, type NextRequest } from 'next/server';

/**
 * Check if a valid Supabase auth session cookie exists.
 * The browser client stores session in a cookie named
 * `sb-<project-ref>-auth-token` via our hybrid storage adapter.
 */
export function checkSession(request: NextRequest) {
  const hasAuthCookie = request.cookies.getAll().some(
    cookie => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  );
  return { hasAuthCookie, response: NextResponse.next({ request }) };
}
