import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('SUPABASE_URL from env:', process.env.NEXT_PUBLIC_SUPABASE_URL);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase environment variables are missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
  );
}

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
          debit: number | null;
          credit: number | null;
          bank_account_code: string | null;
          platform: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          balance?: number | null;
          category?: string;
          account_id?: string | null;
          debit?: number | null;
          credit?: number | null;
          bank_account_code?: string | null;
          platform?: string | null;
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
          debit?: number | null;
          credit?: number | null;
          bank_account_code?: string | null;
          platform?: string | null;
        };
      };
      normalized_transactions: {
        Row: {
          id: string;
          transaction_id: string;
          txn_type: string;
          property_id: string | null;
          owner_id: string | null;
          platform: string | null;
          confidence: string;
          inference_reason: string | null;
          bank_account_id: string | null;
          created_at: string;
        };
        Insert: {
          transaction_id: string;
          txn_type: string;
          property_id?: string | null;
          owner_id?: string | null;
          platform?: string | null;
          confidence: string;
          inference_reason?: string | null;
          bank_account_id?: string | null;
        };
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          source_txn_id: string | null;
          source_type: string;
          description: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          source_txn_id?: string | null;
          source_type: string;
          description: string;
        };
      };
      journal_lines: {
        Row: {
          id: string;
          journal_entry_id: string;
          account_code: string;
          debit: number;
          credit: number;
          property_id: string | null;
          owner_id: string | null;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          journal_entry_id: string;
          account_code: string;
          debit: number;
          credit: number;
          property_id?: string | null;
          owner_id?: string | null;
          memo?: string | null;
        };
      };
    };
  };
}
