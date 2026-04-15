import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// We use placeholders if variables are missing to prevent build-time crashes.
// The actual values must be provided in the environment for the app to function.
const placeholderUrl = 'https://placeholder-project.supabase.co';
const placeholderKey = 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing in environment variables. Build will proceed with placeholders but functionality will be limited.');
}

export const supabase = createClient(
  supabaseUrl || placeholderUrl, 
  supabaseAnonKey || placeholderKey
);
