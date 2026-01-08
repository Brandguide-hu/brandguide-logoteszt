import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
