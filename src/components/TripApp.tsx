import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { aiEnabled } from '../lib/api';
import { applyTheme, usePref, type Theme } from '../lib/prefs';
import { APP_VERSION } from '../lib/revisions';
import { supabase } from '../lib/supabase';
import { joinTrip, localTokens, tripTokenFromPath, useTrips } from '../lib/tripStore';
import { Icon } from './Icon';
import { RevisionHistory } from './RevisionHistory';
import { TripsHome, useMemberName } from './Trips';
import { Modal, Segmented, Toasts, useToasts } from './ui';

/**
 * 내 여행 목록 ↔ 여행 카드. 로그인 없이 쓰고(목록은 이 기기에 기억), 로그인하면 여러 기기에서 목록이 이어진다.
 * 여행 카드는 /t/<token> 주소를 써서 새로고침·뒤로 가기·공유가 그대로 동작한다.
 */
export function TripApp({ user, initialTrip }: { user: User | null; initialTrip: string | null }) {
  const trips = useTrips(user?.id ?? null);
  const { toasts, show, dismiss } = useToasts();
  const [me, setMe] = useMemberName(user?.email?.split('@')[0] ?? '');
  const [token, setToken] = useState<string | null>(initialTrip);
  const [theme, setTheme] = usePref<Theme>('theme', 'system');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revOpen, setRevOpen] = useState(false);
  const [ai, setAi] = useState(false);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    void aiEnabled().then(setAi);
  }, []);
  // 로그인 전에 이 기기에서 쓰던 여행을 계정에 붙인다 → 다른 기기에서도 보인다.
  useEffect(() => {
    if (!user) return;
    const tokens = localTokens();
    if (tokens.length) void Promise.all(tokens.map((t) => joinTrip(t))).then(() => trips.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const open = useCallback((t: string | null) => {
    setToken(t);
    const path = t ? `/t/${t}` : '/';
    if (window.location.pathname !== path || window.location.search) window.history.pushState(null, '', path);
  }, []);
  useEffect(() => {
    const onPop = () => setToken(tripTokenFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div className="app-shell">
      <main className="app-main">
        <TripsHome
          api={trips}
          ai={ai}
          loggedIn={!!user}
          me={me}
          setMe={setMe}
          notify={(text, kind, action) => show(text, { kind, action })}
          openToken={token}
          onOpen={open}
          onSettings={() => setSettingsOpen(true)}
          overlayPaused={settingsOpen || revOpen}
        />
      </main>

      {settingsOpen ? (
        <Modal title="설정" onClose={() => setSettingsOpen(false)} size="sm">
          <div className="settings">
            <section>
              <h3>계정</h3>
              {user ? (
                <>
                  <div className="setting-row">
                    <span>
                      <strong>{user.email}</strong>
                      <span className="muted-text">어느 기기에서 로그인해도 내 여행 목록이 같습니다.</span>
                    </span>
                  </div>
                  <button type="button" className="btn" onClick={() => void supabase.auth.signOut()}>
                    <Icon name="logout" size={18} />
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <p className="muted-text">
                    로그인 없이 쓰는 중입니다. 내 여행 목록은 이 기기에 저장되고, 공유 링크를 받은 사람은 누구나 함께 볼 수 있습니다. 로그인하면 여러 기기에서 목록이 이어지고 공유를 끄거나 링크를 바꿀 수 있습니다.
                  </p>
                  <a className="btn" href="/?login=1">
                    로그인 · 가입 (선택)
                  </a>
                </>
              )}
              <p className="muted-text">체크·기록에 표시될 이름: {me || '없음'} (여행 카드의 공유 화면에서 바꿀 수 있습니다)</p>
            </section>
            <section>
              <h3>화면 테마</h3>
              <Segmented<Theme>
                label="화면 테마"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'system', label: '시스템' },
                  { value: 'light', label: '라이트' },
                  { value: 'dark', label: '다크' },
                ]}
              />
            </section>
            <section>
              <h3>버전</h3>
              <button type="button" className="version-btn" onClick={() => (setSettingsOpen(false), setRevOpen(true))} aria-label={`버전 ${APP_VERSION}, 리비전 히스토리 보기`}>
                v{APP_VERSION}
              </button>
            </section>
          </div>
        </Modal>
      ) : null}

      {revOpen ? <RevisionHistory onClose={() => setRevOpen(false)} /> : null}
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
