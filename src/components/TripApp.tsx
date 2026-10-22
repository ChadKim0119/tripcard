import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { aiEnabled } from '../lib/api';
import { applyTheme, usePref, type Theme } from '../lib/prefs';
import { APP_VERSION } from '../lib/revisions';
import { supabase } from '../lib/supabase';
import { tripTokenFromPath, useTrips } from '../lib/tripStore';
import { Icon } from './Icon';
import { RevisionHistory } from './RevisionHistory';
import { TripsHome, useMemberName } from './Trips';
import { Modal, Segmented, Toasts, useToasts } from './ui';

/** 로그인한 사람의 앱: 내 여행 목록 ↔ 여행 카드. 여행 카드는 /t/<token> 주소를 써서 새로고침·뒤로 가기·공유가 그대로 동작한다. */
export function TripApp({ user, initialTrip }: { user: User; initialTrip: string | null }) {
  const trips = useTrips(user.id);
  const { toasts, show, dismiss } = useToasts();
  const [me, setMe] = useMemberName(user.email?.split('@')[0] ?? '');
  const [token, setToken] = useState<string | null>(initialTrip);
  const [theme, setTheme] = usePref<Theme>('theme', 'system');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revOpen, setRevOpen] = useState(false);
  const [ai, setAi] = useState(false);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    void aiEnabled().then(setAi);
  }, []);

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
              <div className="setting-row">
                <span>
                  <strong>{user.email}</strong>
                  <span className="muted-text">체크·기록에 표시될 이름: {me || '없음'} (여행 카드의 공유 화면에서 바꿀 수 있습니다)</span>
                </span>
              </div>
              <button type="button" className="btn" onClick={() => void supabase.auth.signOut()}>
                <Icon name="logout" size={18} />
                로그아웃
              </button>
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
