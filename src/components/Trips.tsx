import { useEffect, useMemo, useState } from 'react';
import { findUrl } from '../lib/detect';
import { coverFromMap } from '../lib/covers';
import { dDay, formatRange, tripPhase, type Trip } from '../lib/trip';
import { canDeleteTrip, getMemberName, joinTrip, rememberTrip, setMemberName, useTrip, type TripsApi } from '../lib/tripStore';
import { Icon } from './Icon';
import { NewTripSheet, removeCopy } from './TripSheets';
import { TripView, type Notify } from './TripView';
import { Confirm } from './ui';

/** 체크·기록에 남길 이름. 로그인했으면 처음엔 이메일 앞부분, 바꾸면 기기에 기억한다. */
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

/* ================================================================== 목록 */

export function TripsHome({
  api,
  ai,
  loggedIn,
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
  loggedIn: boolean;
  me: string;
  setMe: (n: string) => void;
  notify: Notify;
  openToken: string | null;
  onOpen: (token: string | null) => void;
  onSettings: () => void;
  overlayPaused: boolean;
}) {
  const [creating, setCreating] = useState<{ seedUrl?: string } | null>(null);
  const [removing, setRemoving] = useState<Trip | null>(null);

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
    const deleting = canDeleteTrip(trip);
    onOpen(null);
    api.removeTrip(trip).then(
      () =>
        notify(deleting ? '여행을 삭제했습니다' : '목록에서 뺐습니다', 'info', { label: '실행 취소', run: () => void api.restoreTrip(trip) }),
      () => notify('삭제하지 못했습니다', 'error'),
    );
  };

  if (openToken) {
    const listed = api.trips.find((t) => t.share_token === openToken);
    return (
      <TripDetail
        key={openToken}
        token={openToken}
        loggedIn={loggedIn}
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
              <p className="muted-text">여행사 일정·상품 링크를 붙여넣으면 일정·체크리스트·자료가 담긴 여행 카드가 만들어지고, 링크 하나로 다른 가족과 함께 채울 수 있습니다. 로그인은 필요 없습니다.</p>
              <button type="button" className="btn btn-primary" onClick={() => setCreating({})}>
                <Icon name="plus" size={18} />새 여행 만들기
              </button>
            </div>
          )
        ) : (
          <>
            {upcoming.length ? <TripSection title="다가오는 여행" trips={upcoming} onOpen={onOpen} onRemove={setRemoving} loggedIn={loggedIn} /> : null}
            {past.length ? <TripSection title="다녀온 여행" trips={past} onOpen={onOpen} onRemove={setRemoving} loggedIn={loggedIn} /> : null}
          </>
        )}
      </section>

      <button type="button" className="fab only-mobile" aria-label="새 여행" onClick={() => setCreating({})}>
        <Icon name="plus" size={24} />
      </button>

      {removing ? <Confirm {...removeCopy(removing)} danger onConfirm={() => remove(removing)} onClose={() => setRemoving(null)} /> : null}

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

function TripSection({
  title,
  trips,
  onOpen,
  onRemove,
  loggedIn,
}: {
  title: string;
  trips: Trip[];
  onOpen: (token: string) => void;
  onRemove: (trip: Trip) => void;
  loggedIn: boolean;
}) {
  return (
    <section className="trip-section">
      <h2 className="trip-section-title">{title}</h2>
      <ul className="trip-grid">
        {trips.map((t) => (
          <li key={t.id} className="trip-card-wrap">
            <TripCard trip={t} onOpen={() => onOpen(t.share_token)} loggedIn={loggedIn} />
            <button
              type="button"
              className="trip-card-remove"
              aria-label={`${t.title || '여행'} ${canDeleteTrip(t) ? '삭제' : '목록에서 빼기'}`}
              title={canDeleteTrip(t) ? '삭제' : '목록에서 빼기'}
              onClick={() => onRemove(t)}
            >
              <Icon name="trash" size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TripCard({ trip, onOpen, loggedIn }: { trip: Trip; onOpen: () => void; loggedIn: boolean }) {
  const total = trip.check_total ?? 0;
  const done = trip.check_done ?? 0;
  const phase = tripPhase(trip);
  const cover = trip.cover ?? coverFromMap(trip.destination);
  return (
    <button type="button" className="card trip-card" onClick={onOpen}>
      <span className="trip-card-cover">
        {cover ? <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Icon name="plane" size={24} />}
        <span className={`trip-dday ph-${phase}`}>{dDay(trip)}</span>
      </span>
      <span className="card-body">
        <span className="card-title">{trip.title || trip.destination || '새 여행'}</span>
        <span className="card-meta">
          {[trip.destination, formatRange(trip)].filter(Boolean).join(' · ')}
          {loggedIn && !trip.is_owner ? <span className="badge badge-info">참여</span> : null}
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

/* ================================================================== 상세 */

function TripDetail({
  token,
  loggedIn,
  me,
  setMe,
  notify,
  onBack,
  onRemove,
}: {
  token: string;
  loggedIn: boolean;
  me: string;
  setMe: (n: string) => void;
  notify: Notify;
  onBack: () => void;
  onRemove?: () => void;
}) {
  const api = useTrip(token);
  const [askName, setAskName] = useState(!me);
  // 링크로 연 여행은 이 기기의 '내 여행'에 남는다. 로그인했으면 계정에도 참여로 기록한다.
  useEffect(() => {
    if (!api.trip) return;
    rememberTrip(token);
    if (loggedIn) void joinTrip(token);
  }, [api.trip, token, loggedIn]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    document.title = api.trip ? `${api.trip.title || '여행'} · 트립카드` : '트립카드';
    return () => {
      document.title = '트립카드';
    };
  }, [api.trip]);
  const members = useMemo(() => api.trip?.members ?? [], [api.trip]);

  return (
    <>
      <TripView api={api} me={me} setMe={setMe} canUnfurl notify={notify} onBack={onBack} onRemoveTrip={onRemove} />
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
            <p className="muted-text">체크하고 기록을 남길 때 이름이 함께 표시됩니다. 로그인은 필요 없습니다.</p>
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
    </>
  );
}
