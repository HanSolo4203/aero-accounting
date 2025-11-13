import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          balance: number | null;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          balance?: number | null;
          category: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          description?: string;
          amount?: number;
          balance?: number | null;
          category?: string;
          created_at?: string;
        };
      };
    };
  };
}
