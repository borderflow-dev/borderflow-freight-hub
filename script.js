import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://ngkmbpbdaachqymnfffe.supabase.co';
export const SUPABASE_ANON_KEY = 'PASTE_YOUR_PUBLISHABLE_KEY_HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
