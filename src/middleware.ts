import { NextResponse, type NextRequest } from 'next/server';
import { checkSession } from '@/lib/supabase/middleware';
import { createClient } from '@supabase/supabase-js';

// --- Maintenance mode config ---
const BYPASS_COOKIE = 'logolab_bypass';
const BYPASS_SECRET = process.env.MAINTENANCE_BYPASS_SECRET ?? '';

// Routes accessible during maintenance mode
const MAINTENANCE_PUBLIC_PATHS = [
  '/karbantartas',
  '/galeria',
  '/eredmeny/',
  '/megosztott/',
  '/s/',
  '/api/webhooks/',
  '/api/og/',
  '/api/result/',
  '/api/gallery',
  '/api/featured-analyses',
  '/api/email/',       // Email értesítések (szerver-szerver callback-ek)
  '/api/analyze/',     // Elemzés API-k (SSE, vision, stb.)
  '/api/analysis/',    // Elemzés létrehozás/indítás
  '/_next',
  '/favicon',
  '/logo',
  '/icon.png',
];

// --- Auth config (existing) ---
const PROTECTED_ROUTES = ['/dashboard'];
const ADMIN_ROUTES = ['/admin'];

// --- 30s in-memory cache for DB maintenance check ---
let cachedMaintenanceMode: boolean | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 30_000;

async function getMaintenanceModeFromDB(): Promise<boolean> {
  const now = Date.now();
  if (cachedMaintenanceMode !== null && now < cacheExpiry) {
    return cachedMaintenanceMode;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single();

    cachedMaintenanceMode = data?.value === 'true';
  } catch {
    cachedMaintenanceMode = false;
  }

  cacheExpiry = now + CACHE_TTL;
  return cachedMaintenanceMode!;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check if path is public during maintenance
  const isMaintenancePublic = MAINTENANCE_PUBLIC_PATHS.some(p =>
    pathname === p || pathname.startsWith(p),
  );

  // 2. Determine if maintenance mode is active
  const envMaintenance = process.env.MAINTENANCE_MODE === 'true';
  const isMaintenanceMode = envMaintenance || await getMaintenanceModeFromDB();

  if (isMaintenanceMode && !isMaintenancePublic) {
    // 3. Check bypass cookie
    const bypassCookie = request.cookies.get(BYPASS_COOKIE);
    if (bypassCookie?.value === BYPASS_SECRET && BYPASS_SECRET !== '') {
      // Bypass active — fall through to normal auth logic
    } else {
      // 4. Check bypass query param
      const bypassParam = request.nextUrl.searchParams.get('bypass');
      if (bypassParam === BYPASS_SECRET && BYPASS_SECRET !== '') {
        const url = new URL('/', request.url);
        const response = NextResponse.redirect(url);
        response.cookies.set(BYPASS_COOKIE, BYPASS_SECRET, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return response;
      }

      // 5. Redirect to maintenance page
      return NextResponse.rewrite(new URL('/karbantartas', request.url));
    }
  }

  // --- Existing auth logic ---
  const { hasAuthCookie, response } = checkSession(request);

  // Visual analysis test page is public
  const isVisualTestPage = /^\/dashboard\/[^/]+\/visual$/.test(pathname);

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));

  if ((isProtectedRoute || isAdminRoute) && !isVisualTestPage && !hasAuthCookie) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$).*)'],
};
