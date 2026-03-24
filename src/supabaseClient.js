import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ndeyqrracvqtqzmhmkus.supabase.co';
const supabaseAnonKey = 'sb_publishable_T7SdBWDnXf5m8x-U8us-jA_X5my9Bz_';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
