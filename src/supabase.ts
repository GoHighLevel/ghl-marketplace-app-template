import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export interface Installation {
  id: string;
  resource_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_type: string;
  company_id?: string;
  location_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Database type helpers
export type InsertInstallation = Omit<Installation, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInstallation = Partial<InsertInstallation>; 