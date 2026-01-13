import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Legacy export for backward compatibility
export const supabase = {
  from: (table: string) => getSupabase().from(table),
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string;
          result: Json;
          logo_base64: string;
          created_at: string;
          test_level: string;
        };
        Insert: {
          id?: string;
          result: Json;
          logo_base64: string;
          created_at?: string;
          test_level: string;
        };
        Update: {
          id?: string;
          result?: Json;
          logo_base64?: string;
          created_at?: string;
          test_level?: string;
        };
      };
    };
  };
}
