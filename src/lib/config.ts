// 공개(publishable) 값이다. 데이터 보호는 Supabase RLS·공유 토큰 RPC 가 담당한다.
// MyArchive 와 같은 Supabase 프로젝트를 쓴다 (계정 공유, 여행 데이터는 trips 테이블로 분리).
// 다른 프로젝트를 쓰려면 VITE_SUPABASE_URL / VITE_SUPABASE_KEY 로 바꾼다.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? 'https://zyhlhkqyigyrubovkxjr.supabase.co';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_PEpa524w3nSiyIM3p5V0_w_2RaLiclQ';
export const CONFIGURED = !!(SUPABASE_URL && SUPABASE_KEY);
