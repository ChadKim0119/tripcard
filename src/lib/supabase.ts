import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './config';

// 설정 전에도 앱이 뜨도록 자리값을 쓴다 (App 이 '설정 필요' 화면을 보여 준다).
export const supabase = createClient(SUPABASE_URL || 'https://not-configured.supabase.co', SUPABASE_KEY || 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
