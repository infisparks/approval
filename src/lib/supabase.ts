import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://abgypuzepqoguwgrkoxx.supabase.co';
const supabaseAnonKey = 'sb_publishable_9dhSI0LnZjYAxM5XdDxBIA_6Nq3cWYu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
