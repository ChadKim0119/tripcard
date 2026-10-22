// 공개(publishable) 값이다. 데이터 보호는 Supabase RLS·공유 토큰 RPC 가 담당한다.
// 배포 환경(Vercel)의 VITE_SUPABASE_URL / VITE_SUPABASE_KEY 로 지정한다.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? '';
export const CONFIGURED = !!(SUPABASE_URL && SUPABASE_KEY);
