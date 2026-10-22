import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthScreen, NewPasswordScreen } from './components/AuthScreen';
import { TripApp } from './components/TripApp';
import { TripShared } from './components/Trips';
import { CONFIGURED } from './lib/config';
import { supabase } from './lib/supabase';
import { tripTokenFromPath } from './lib/tripStore';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(CONFIGURED ? undefined : null);
  // 비밀번호 재설정 링크로 들어온 경우. 해시에 type=recovery 가 실려 온다.
  const [recovering, setRecovering] = useState(() => window.location.hash.includes('type=recovery'));

  useEffect(() => {
    if (!CONFIGURED) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!CONFIGURED)
    return (
      <div className="auth">
        <div className="auth-card">
          <p className="empty-title">서버 연결 설정이 필요합니다</p>
          <p className="muted-text">배포 환경 변수 VITE_SUPABASE_URL · VITE_SUPABASE_KEY 를 지정하세요. README 의 설치 순서를 참고하세요.</p>
        </div>
      </div>
    );

  // 공유 링크(/t/<token>)는 로그인 없이 열린다. 로그인하면 내 여행 목록에도 들어온다.
  const tripToken = tripTokenFromPath();
  const wantsLogin = new URLSearchParams(window.location.search).has('login');

  if (session === undefined) return <div className="boot" aria-busy="true" />;
  if (!session) return tripToken && !wantsLogin ? <TripShared token={tripToken} session={null} /> : <AuthScreen />;
  if (recovering) return <NewPasswordScreen onDone={() => setRecovering(false)} />;
  return <TripApp key={session.user.id} user={session.user} initialTrip={tripToken} />;
}
