import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Cookie+localStorage hybrid storage adapter.
 * Writes to both localStorage (for Supabase JS client session) and
 * cookies (for Next.js middleware auth checks).
 */
const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
    // Mirror to cookie for middleware access
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  },
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
    document.cookie = `${key}=; path=/; max-age=0`;
  },
};

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    browserClient = createClient(url, anonKey, {
      auth: {
        storage: cookieStorage,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    });
  }
  return browserClient;
}
