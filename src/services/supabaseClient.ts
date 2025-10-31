import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          provider: string;
          provider_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          provider: string;
          provider_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          provider?: string;
          provider_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      backups: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          data: any; // JSONB
          size_bytes: number;
          bookmark_count: number;
          folder_count: number;
          type: 'manual' | 'auto';
          status: 'pending' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          data: any;
          size_bytes: number;
          bookmark_count: number;
          folder_count: number;
          type: 'manual' | 'auto';
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          data?: any;
          size_bytes?: number;
          bookmark_count?: number;
          folder_count?: number;
          type?: 'manual' | 'auto';
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
      };
      backup_schedules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          frequency: 'daily' | 'weekly' | 'monthly';
          enabled: boolean;
          last_run: string | null;
          next_run: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          frequency: 'daily' | 'weekly' | 'monthly';
          enabled?: boolean;
          last_run?: string | null;
          next_run?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          frequency?: 'daily' | 'weekly' | 'monthly';
          enabled?: boolean;
          last_run?: string | null;
          next_run?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
