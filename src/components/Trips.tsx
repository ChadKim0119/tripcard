import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { findUrl } from '../lib/detect';
import { dDay, formatRange, tripPhase, type Trip } from '../lib/trip';
import { getMemberName, joinTrip, setMemberName, useTrip, type TripsApi } from '../lib/tripStore';
import { Icon } from './Icon';
import { NewTripSheet } from './TripSheets';
import { TripView, type Notify } from './TripView';
import { Toasts, useToasts } from './ui';

/** 체크·기록에 남길 이름. 처음엔 로그인 이메일 앞부분, 바꾸면 기기에 기억한다. */
export function useMemberName(fallback: string): [string, (n: string) => void] {
  const [name, setName] = useState(() => getMemberName() || fallback);
  return [
    name,
    (n: string) => {
      setMemberName(n);
      setName(n.trim());
    },
  ];
}

/* ================================================================== 목록 (로그인) */

export function TripsHome({
  api,
  ai,
  me,
  setMe,
  notify,
  openToken,
  onOpen,
  onSettings,
  overlayPaused,
}: {
  api: TripsApi;
  ai: boolean;
  me: string;
  setMe: (n: string) => void;
  notify: Notify;
  openToken: string | null;
  onOpen: (token: string | null) => void;
  onSettings: () => void;
  overlayPaused: boolean;
}) {
  const [creating, setCreating] = useState<{ seedUrl?: string } | null>(null);

  // 여행 목록에서 링크를 붙여넣으면 바로 새 여행 만들기
  useEffect(() => {
    if (openToken || creating || overlayPaused) return;
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const url = findUrl(e.clipboardData?.getData('text') ?? '');
      if (!url) return;
      e.preventDefault();
      setCreating({ seedUrl: url });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [openToken, creating, overlayPaused]);

  const remove = (trip: Trip) => {
    onOpen(null);
    api.removeTrip(trip).then(
      () =>
        notify(trip.is_owner ? '여행을 삭제했습니다' : '목록에서 뺐습니다', 'info', trip.is_owner ? { label: '실행 취소', run: () => void api.restoreTrip(trip) } : undefined),
      () => notify('삭제하지 못했습니다', 'error'),
    );
  };

  if (openToken) {
    const listed = api.trips.find((t) => t.share_token === openToken);
    return (
      <TripDetail
        key={openToken}
        token={openToken}
        me={me}
        setMe={setMe}
        notify={notify}
        onBack={() => {
          onOpen(null);
          void api.refresh();
        }}
        onRemove={listed ? () => remove(listed) : undefined}
      />
    );
  }

  const upcoming = api.trips.filter((t) => tripPhase(t) !== 'after');
  const past = api.trips.filter((t) => tripPhase(t) === 'after');

  return (
    <>
      <header className="topbar">
        <div className="topbar-title">
          <img src="/icon.svg" alt="" width={32} height={32} className="app-logo" />
          <h1>내 여행</h1>
          <span className="count-pill">{api.trips.length}</span>
          <span className="spacer" />
          <button type="button" className="btn btn-primary only-desktop" onClick={() => setCreating({})}>
            <Icon name="plus" size={18} />
            새 여행
          </button>
          <button type="button" className="icon-btn" aria-label="설정" onClick={onSettings}>
            <Icon name="settings" />
          </button>
        </div>
      </header>
      <section className="content" aria-label="여행 목록" aria-busy={api.sync === 'loading' && !api.trips.length}>
        {!api.trips.length ? (
          api.sync === 'loading' ? (
            <div className="trip-grid" aria-hidden="true">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="card skeleton trip-skeleton" />
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-art" aria-hidden="true">
                <Icon name="plane" size={24} />
                <Icon name="checklist" size={24} />
                <Icon name="journal" size={24} />
              </div>
              <p className="empty-title">첫 여행 카드를 만들어 보세요</p>
              <p className="muted-text">여행사 일정·상품 링크를 붙여넣으면 일정·체크리스트·자료가 담긴 여행 카드가 만들어지고, 링크 하나로 다른 가족과 함께 채울 수 있습니다.</p>
              <button type="button" className="btn btn-primary" onClick={() => setCreating({})}>
                <Icon name="plus" size={18} />새 여행 만들기
              </button>
            </div>
          )
        ) : (
          <>
            {upcoming.length ? <TripSection title="다가오는 여행" trips={upcoming} onOpen={onOpen} /> : null}
            {past.length ? <TripSection title="다녀온 여행" trips={past} onOpen={onOpen} /> : null}
          </>
        )}
      </section>

      <button type="button" className="fab only-mobile" aria-label="새 여행" onClick={() => setCreating({})}>
        <Icon name="plus" size={24} />
      </button>

      {creating ? (
        <NewTripSheet
          ai={ai}
          canUnfurl
          me={me}
          seedUrl={creating.seedUrl}
          onClose={() => setCreating(null)}
          onCreate={async (info, entries) => {
            const trip = await api.create(info, entries);
            setCreating(null);
            notify('여행 카드를 만들었습니다', 'success');
            onOpen(trip.share_token);
          }}
        />
      ) : null}
    </>
  );
}

function TripSection({ title, trips, onOpen }: { title: string; trips: Trip[]; onOpen: (token: string) => void }) {
  return (
    <section className="trip-section">
      <h2 className="trip-section-title">{title}</h2>
      <ul className="trip-grid">
        {trips.map((t) => (
          <li key={t.id}>
            <TripCard trip={t} onOpen={() => onOpen(t.share_token)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TripCard({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const total = trip.check_total ?? 0;
  const done = trip.check_done ?? 0;
  const phase = tripPhase(trip);
  return (
    <button type="button" className="card trip-card" onClick={onOpen}>
      <span className="trip-card-cover">
        {trip.cover ? <img src={trip.cover} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Icon name="plane" size={24} />}
        <span className={`trip-dday ph-${phase}`}>{dDay(trip)}</span>
      </span>
      <span className="card-body">
        <span className="card-title">{trip.title || trip.destination || '새 여행'}</span>
        <span className="card-meta">
          {[trip.destination, formatRange(trip)].filter(Boolean).join(' · ')}
          {!trip.is_owner ? <span className="badge badge-info">참여</span> : null}
        </span>
        {total ? (
          <span className="trip-progress small" aria-label={`준비 ${done}/${total}`}>
            <span className="trip-progress-bar">
              <span style={{ width: `${(done / total) * 100}%` }} />
            </span>
            <span>
              {done}/{total}
            </span>
          </span>
        ) : null}
        <span className="trip-card-stats">
          일정 {trip.plan_count ?? 0} · 기록 {trip.note_count ?? 0}
          {trip.members.length ? ` · ${trip.members.join(', ')}` : ''}
        </span>
      </span>
    </button>
  );
}

/* ================================================================== 상세 (로그인) */

function TripDetail({
  token,
  me,
  setMe,
  notify,
  onBack,
  onRemove,
  headerStart,
}: {
  token: string;
  me: string;
  setMe: (n: string) => void;
  notify: Notify;
  onBack: () => void;
  onRemove?: () => void;
  headerStart?: ReactNode;
}) {
  const api = useTrip(token);
  useEffect(() => {
    void joinTrip(token);
  }, [token]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  return <TripView api={api} me={me} setMe={setMe} canUnfurl notify={notify} onBack={onBack} onRemoveTrip={onRemove} headerStart={headerStart} />;
}

/* ================================================================== 공유 링크 (로그인 없이) */

export function TripShared({ token, session }: { token: string; session: Session | null }) {
  const api = useTrip(token);
  const { toasts, show, dismiss } = useToasts();
  const [me, setMe] = useMemberName('');
  const [askName, setAskName] = useState(!me);
  const notify: Notify = (text, kind, action) => show(text, { kind, action });

  useEffect(() => {
    if (session) void joinTrip(token);
  }, [session, token]);
  useEffect(() => {
    if (api.trip) document.title = `${api.trip.title || '여행'} · 트립카드`;
  }, [api.trip]);

  const members = useMemo(() => api.trip?.members ?? [], [api.trip]);

  return (
    <div className="shared-shell">
      <header className="shared-bar">
        <a className="brand" href="/">
          <img src="/icon.svg" alt="" width={26} height={26} />
          <span>트립카드</span>
        </a>
        <span className="spacer" />
        {me ? (
          <button type="button" className="chip-btn" onClick={() => setAskName(true)} aria-label={`내 이름 ${me}, 바꾸기`}>
            <Icon name="users" size={16} />
            {me}
          </button>
        ) : null}
        {!session ? (
          <a className="btn btn-sm" href={`/t/${token}?login=1`}>
            로그인
          </a>
        ) : null}
      </header>
      <main className="shared-main">
        <TripView api={api} me={me} setMe={setMe} canUnfurl={!!session} notify={notify} />
      </main>

      {askName && api.trip ? (
        <div className="name-card" role="dialog" aria-label="이름 입력">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get('name')?.toString() ?? '';
              if (v.trim()) setMe(v);
              setAskName(false);
            }}
          >
            <p className="clip-head">
              <strong>누가 함께 쓰나요?</strong>
            </p>
            <p className="muted-text">체크하고 기록을 남길 때 이름이 함께 표시됩니다.</p>
            {members.length ? (
              <div className="prompt-chips">
                {members.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="chip-btn"
                    onClick={() => {
                      setMe(m);
                      setAskName(false);
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="add-row">
              <input name="name" defaultValue={me} placeholder="예: 엄마, 민수네" aria-label="내 이름" autoFocus />
              <button type="submit" className="btn btn-primary">
                확인
              </button>
            </div>
            <button type="button" className="link-btn" onClick={() => setAskName(false)}>
              나중에
            </button>
          </form>
        </div>
      ) : null}

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
