import { useMemo, useState } from 'react';
import { aiTrip, unfurl, type Unfurled } from '../lib/api';
import { asUrl, hostOf, youtubeThumb } from '../lib/detect';
import {
  addDays,
  dayLabel,
  defaultChecklist,
  formatRange,
  guessDestination,
  linkCategory,
  newEntry,
  parseItinerary,
  type Trip,
  type TripEntry,
  type TripPatch,
} from '../lib/trip';
import { setSharing, shareUrl, type TripApi } from '../lib/tripStore';
import { Icon } from './Icon';
import type { Notify } from './TripView';
import { Confirm, copyText, Modal } from './ui';

const splitMembers = (s: string) =>
  s
    .split(/[,·\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);

/* ================================================================== 여행 정보 */

function InfoFields({ v, set }: { v: TripPatch & { membersText: string }; set: (p: Partial<TripPatch & { membersText: string }>) => void }) {
  return (
    <>
      <label className="field">
        <span className="field-label">여행 이름</span>
        <input data-autofocus value={v.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="예: 오사카 4박 5일 두 가족 여행" />
      </label>
      <label className="field">
        <span className="field-label">목적지</span>
        <input value={v.destination ?? ''} onChange={(e) => set({ destination: e.target.value })} placeholder="예: 오사카" />
      </label>
      <div className="field-pair">
        <label className="field">
          <span className="field-label">출발</span>
          <input
            type="date"
            value={v.start_date ?? ''}
            onChange={(e) => set({ start_date: e.target.value || null, end_date: v.end_date && e.target.value && v.end_date < e.target.value ? e.target.value : v.end_date })}
          />
        </label>
        <label className="field">
          <span className="field-label">도착</span>
          <input type="date" value={v.end_date ?? ''} min={v.start_date ?? undefined} onChange={(e) => set({ end_date: e.target.value || null })} />
        </label>
      </div>
      <label className="field">
        <span className="field-label">
          함께 가는 가족 · 멤버<em>쉼표로 구분</em>
        </span>
        <input value={v.membersText} onChange={(e) => set({ membersText: e.target.value })} placeholder="예: 우리 가족, 민수네" />
      </label>
    </>
  );
}

export function TripInfoSheet({ trip, onSave, onRemove, onClose }: { trip: Trip; onSave: (p: TripPatch) => void; onRemove?: () => void; onClose: () => void }) {
  const [v, setV] = useState({ ...trip, membersText: trip.members.join(', ') });
  const [confirm, setConfirm] = useState(false);
  const set = (p: Partial<typeof v>) => setV((x) => ({ ...x, ...p }));
  return (
    <Modal
      title="여행 정보"
      onClose={onClose}
      footer={
        <div className="action-bar">
          {onRemove ? (
            <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirm(true)}>
              <Icon name="trash" size={18} />
              {trip.is_owner ? '여행 삭제' : '내 목록에서 빼기'}
            </button>
          ) : null}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" form="trip-info" className="btn btn-primary">
            저장
          </button>
        </div>
      }
    >
      <form
        id="trip-info"
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            title: v.title.trim(),
            destination: v.destination.trim(),
            start_date: v.start_date || null,
            end_date: v.end_date || null,
            members: splitMembers(v.membersText),
            summary: v.summary,
            cover: v.cover ? (asUrl(v.cover) ?? null) : null,
            source_url: v.source_url ? (asUrl(v.source_url) ?? null) : null,
          });
        }}
      >
        <InfoFields v={v} set={set} />
        <label className="field">
          <span className="field-label">한 줄 소개 · 상품 메모</span>
          <textarea rows={3} value={v.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="포함 사항, 특전, 집결 시간 등" />
        </label>
        <label className="field">
          <span className="field-label">여행사 일정 · 상품 링크</span>
          <input type="url" inputMode="url" value={v.source_url ?? ''} onChange={(e) => set({ source_url: e.target.value })} placeholder="https://" />
        </label>
        <label className="field">
          <span className="field-label">
            대표 이미지 주소<em>선택</em>
          </span>
          <input type="url" inputMode="url" value={v.cover ?? ''} onChange={(e) => set({ cover: e.target.value })} placeholder="https://…jpg" />
        </label>
      </form>
      {confirm && onRemove ? (
        <Confirm
          title={trip.is_owner ? '여행 삭제' : '내 목록에서 빼기'}
          message={trip.is_owner ? '이 여행과 공유 링크가 모든 멤버에게서 사라집니다. 잠시 뒤 실행 취소할 수 있습니다.' : '내 여행 목록에서만 빠집니다. 링크로 다시 들어오면 다시 보입니다.'}
          confirmLabel={trip.is_owner ? '삭제' : '빼기'}
          danger
          onConfirm={onRemove}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </Modal>
  );
}

/* ================================================================== 공유 */

export function TripShareSheet({ trip, api, me, setMe, notify, onClose }: { trip: Trip; api: TripApi; me: string; setMe: (n: string) => void; notify: Notify; onClose: () => void }) {
  const [name, setName] = useState(me);
  const [busy, setBusy] = useState(false);
  const link = shareUrl(trip.share_token);

  async function copy() {
    const ok = await copyText(link);
    notify(ok ? '공유 링크를 복사했습니다' : '복사하지 못했습니다', ok ? 'success' : 'error');
  }
  async function nativeShare() {
    try {
      await navigator.share({ title: trip.title || '여행', text: `${trip.title} — 일정·체크리스트를 같이 채워요`, url: link });
    } catch {
      /* 사용자가 닫음 */
    }
  }
  async function owner(changes: { share_enabled?: boolean; rotate?: boolean }) {
    setBusy(true);
    try {
      await setSharing(trip.id, changes);
      await api.refresh();
      notify(changes.rotate ? '새 링크를 만들었습니다. 예전 링크는 더 이상 열리지 않습니다.' : '공유 설정을 바꿨습니다', 'success');
    } catch {
      notify('바꾸지 못했습니다', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="함께 쓰기" onClose={onClose}>
      <div className="form">
        <p className="muted-text">
          이 링크를 받은 사람은 <strong>로그인 없이</strong> 일정·체크리스트·기록을 함께 보고 고칠 수 있고, 누가 바꾸든 모든 화면에 바로 반영됩니다.
        </p>
        {trip.share_enabled || !trip.is_owner ? (
          <>
            <div className="share-link">
              <code>{link}</code>
            </div>
            <div className="action-bar start">
              <button type="button" className="btn btn-primary" onClick={() => void copy()}>
                <Icon name="copy" size={18} />
                링크 복사
              </button>
              {'share' in navigator ? (
                <button type="button" className="btn" onClick={() => void nativeShare()}>
                  <Icon name="share" size={18} />
                  보내기
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="inline-msg warn">공유가 꺼져 있습니다. 참여한 멤버(로그인)와 나만 볼 수 있습니다.</p>
        )}

        <form
          className="field"
          onSubmit={(e) => {
            e.preventDefault();
            setMe(name);
            notify('이름을 저장했습니다', 'success');
          }}
        >
          <span className="field-label">
            이 기기에서 쓸 내 이름<em>체크·기록에 표시</em>
          </span>
          <div className="add-row">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 엄마, 민수네" list="trip-members" />
            <datalist id="trip-members">
              {trip.members.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <button type="submit" className="btn" disabled={name.trim() === me}>
              저장
            </button>
          </div>
        </form>

        {trip.is_owner ? (
          <section className="share-owner">
            <label className="switch-row">
              <span>
                <strong>링크로 공유</strong>
                <span className="muted-text"> — 끄면 링크로 새로 들어올 수 없습니다</span>
              </span>
              <input type="checkbox" className="switch" checked={trip.share_enabled} disabled={busy} onChange={(e) => void owner({ share_enabled: e.target.checked })} />
            </label>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void owner({ rotate: true })}>
              <Icon name="refresh" size={16} />
              새 링크 만들기
            </button>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}

/* ================================================================== 새 여행 */

interface Draft {
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  membersText: string;
  summary: string;
  cover: string | null;
  source_url: string | null;
}

interface Loaded {
  plans: TripEntry[];
  links: TripEntry[];
  packing: string[];
  via: 'ai' | 'rules' | 'none';
}

const EMPTY: Draft = { title: '', destination: '', start_date: null, end_date: null, membersText: '', summary: '', cover: null, source_url: null };

function cleanTitle(t: string) {
  return t
    .replace(/\s*[|\-–:]\s*(하나투어|모두투어|노랑풍선|참좋은여행|인터파크|NOL|롯데관광|교원투어|여행이지|온라인투어|마이리얼트립|클룩|Klook|KKday|트립닷컴|Trip\.com|아고다|에어비앤비|yanolja|야놀자)\b.*$/i, '')
    .trim()
    .slice(0, 120);
}

export function NewTripSheet({
  ai,
  canUnfurl,
  me,
  seedUrl,
  onCreate,
  onClose,
}: {
  ai: boolean;
  canUnfurl: boolean;
  me: string;
  seedUrl?: string;
  onCreate: (info: TripPatch, entries: TripEntry[]) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [links, setLinks] = useState(seedUrl ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState<Loaded>({ plans: [], links: [], packing: [], via: 'none' });
  const [withChecklist, setWithChecklist] = useState(true);
  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const urls = useMemo(
    () =>
      [...links.matchAll(/https?:\/\/[^\s<>"']+|(?:^|\s)([a-z0-9-]+\.)+[a-z]{2,}\/\S*/gi)]
        .map((m) => asUrl(m[0].trim()))
        .filter((u): u is string => !!u)
        .slice(0, 6),
    [links],
  );

  async function load() {
    setErr('');
    setBusy('링크 읽는 중…');
    const metas: Unfurled[] = [];
    if (canUnfurl) {
      for (const u of urls.slice(0, 4)) {
        const m = await unfurl(u, undefined, { full: true }).catch(() => null);
        if (m) metas.push(m);
      }
    }
    const first = metas[0];
    const pageText = metas.map((m) => m.text ?? '').join('\n');
    const all = [text, pageText].filter(Boolean).join('\n');
    const head = [first?.title, first?.description, text.slice(0, 500)].filter(Boolean).join(' ');

    let next: Draft = {
      ...EMPTY,
      title: cleanTitle(first?.title ?? ''),
      summary: first?.description?.slice(0, 300) ?? '',
      cover: first?.image ?? (urls[0] ? youtubeThumb(urls[0]) : null),
      source_url: urls[0] ?? null,
      destination: guessDestination(head) || guessDestination(all),
    };
    let plans: TripEntry[] = [];
    let packing: string[] = [];
    let via: Loaded['via'] = 'none';

    if (ai && all.length > 150) {
      setBusy('AI 가 일정을 정리하는 중…');
      try {
        const r = await aiTrip({ url: urls[0], title: first?.title, text: all });
        next = {
          ...next,
          title: r.title || next.title,
          destination: r.destination || next.destination,
          start_date: r.start_date || null,
          end_date: r.end_date || null,
          summary: r.summary || next.summary,
        };
        plans = r.days.flatMap((d) => d.items.map((it) => newEntry('plan', { day: d.day, time: it.time, title: it.title, body: it.note, author: me })));
        packing = r.packing ?? [];
        via = 'ai';
      } catch {
        /* 규칙 기반으로 계속 */
      }
    }
    if (!plans.length && all) {
      const p = parseItinerary(all);
      next.start_date ??= p.start_date ?? null;
      next.end_date ??= p.end_date ?? null;
      plans = p.days.flatMap((d) => d.items.map((it) => newEntry('plan', { day: d.day, time: it.time, title: it.title, body: it.body, author: me })));
      if (plans.length) via = 'rules';
    }
    // 일정 일수에 맞춰 도착일 추정
    const maxDay = plans.reduce((m, e) => Math.max(m, e.day ?? 0), 0);
    if (next.start_date && !next.end_date && maxDay > 1) next.end_date = addDays(next.start_date, maxDay - 1);
    if (!next.title) next.title = next.destination ? `${next.destination} 여행` : '';

    const linkEntries = urls.map((u, i) => {
      const m = metas.find((x) => x.url === u) ?? (i === 0 ? first : undefined);
      return newEntry('link', {
        url: u,
        title: m?.title || hostOf(u),
        body: m?.description ?? '',
        thumbnail: youtubeThumb(u) ?? m?.image ?? null,
        site_name: m?.site_name ?? hostOf(u),
        group_name: i === 0 && !youtubeThumb(u) ? '여행사' : linkCategory(u),
        author: me,
      });
    });

    setDraft(next);
    setLoaded({ plans, links: linkEntries, packing, via });
    setBusy(null);
    setStep('review');
  }

  async function create() {
    setBusy('여행 카드를 만드는 중…');
    setErr('');
    const entries: TripEntry[] = [
      ...loaded.plans,
      ...loaded.links,
      ...(withChecklist ? defaultChecklist(draft.destination) : []),
      ...loaded.packing.map((title) => newEntry('check', { title, group_name: '이번 여행 준비물', phase: 'before' })),
    ];
    try {
      await onCreate(
        {
          title: draft.title.trim() || '새 여행',
          destination: draft.destination.trim(),
          start_date: draft.start_date,
          end_date: draft.end_date,
          members: splitMembers(draft.membersText),
          summary: draft.summary.trim(),
          cover: draft.cover,
          source_url: draft.source_url,
        },
        entries,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : '만들지 못했습니다');
      setBusy(null);
    }
  }

  const byDay = useMemo(() => {
    const m = new Map<number, TripEntry[]>();
    for (const p of loaded.plans) m.set(p.day ?? 0, [...(m.get(p.day ?? 0) ?? []), p]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [loaded.plans]);

  if (step === 'input')
    return (
      <Modal
        title="새 여행 만들기"
        onClose={onClose}
        footer={
          <div className="action-bar">
            <button type="button" className="btn btn-ghost" onClick={() => setStep('review')}>
              직접 입력
            </button>
            <span className="spacer" />
            <button type="button" className="btn btn-primary" disabled={(!urls.length && !text.trim()) || !!busy} aria-busy={!!busy} onClick={() => void load()}>
              <Icon name="sparkle" size={18} />
              {busy ?? '일정 불러오기'}
            </button>
          </div>
        }
      >
        <div className="form">
          <p className="muted-text">여행사 일정표·상품 소개 링크를 넣으면 제목·사진·일차별 일정을 읽어 하나의 여행 카드로 만듭니다. 유튜브·블로그 링크를 함께 넣으면 자료로 저장됩니다.</p>
          <label className="field">
            <span className="field-label">여행사 일정 · 상품 링크</span>
            <textarea data-autofocus rows={3} value={links} onChange={(e) => setLinks(e.target.value)} placeholder={'https://www.hanatour.com/…\nhttps://youtu.be/… (여러 개는 줄바꿈)'} />
          </label>
          {urls.length ? (
            <p className="field-help">
              링크 {urls.length}개: {urls.map((u) => hostOf(u)).join(', ')}
            </p>
          ) : null}
          <label className="field">
            <span className="field-label">
              일정표 텍스트<em>선택 · 페이지가 안 읽히면 일정 부분을 복사해 붙여넣기</em>
            </span>
            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'1일차 인천 출발 → 간사이 공항 도착\n14:00 오사카성\n2일차 …'} />
          </label>
          {!canUnfurl && urls.length ? <p className="inline-msg info">로그인하지 않으면 링크 내용을 읽을 수 없어 링크만 저장됩니다.</p> : null}
          {err ? <p className="inline-msg error">{err}</p> : null}
        </div>
      </Modal>
    );

  return (
    <Modal
      title="여행 카드 확인"
      onClose={onClose}
      footer={
        <div className="action-bar">
          <button type="button" className="btn btn-ghost" onClick={() => setStep('input')}>
            <Icon name="back" size={18} />
            다시 불러오기
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" disabled={!!busy} aria-busy={!!busy} onClick={() => void create()}>
            {busy ?? '여행 만들기'}
          </button>
        </div>
      }
    >
      <div className="form">
        {draft.cover ? (
          <div className="new-trip-cover">
            <img src={draft.cover} alt="" referrerPolicy="no-referrer" onError={() => set({ cover: null })} />
            <button type="button" className="chip-btn" onClick={() => set({ cover: null })}>
              사진 빼기
            </button>
          </div>
        ) : null}
        <InfoFields v={draft} set={set} />
        <div className="new-trip-summary">
          <p>
            <strong>
              일정 {byDay.length}일 · {loaded.plans.length}개 항목
            </strong>
            {loaded.via === 'ai' ? ' · AI 정리' : loaded.via === 'rules' ? ' · 자동 인식' : ''}
            {draft.start_date ? ` · ${formatRange(draft)}` : ''}
          </p>
          {loaded.plans.length ? (
            <details>
              <summary>불러온 일정 보기</summary>
              <ol className="new-trip-days">
                {byDay.map(([day, list]) => (
                  <li key={day}>
                    <strong>{day ? dayLabel(draft, day) : '날짜 미정'}</strong>
                    <span className="muted-text">{list.map((p) => (p.time ? `${p.time} ${p.title}` : p.title)).join(' → ')}</span>
                  </li>
                ))}
              </ol>
            </details>
          ) : (
            <p className="muted-text">일정을 찾지 못했습니다. 만든 뒤 일정 탭에서 추가하거나, 일정표 텍스트를 붙여넣어 다시 불러오세요.</p>
          )}
          {loaded.links.length ? <p className="muted-text">자료 링크 {loaded.links.length}개 저장</p> : null}
        </div>
        <label className="switch-row">
          <span>
            <strong>기본 체크리스트 넣기</strong>
            <span className="muted-text"> — 서류·통신·짐·다녀온 후 정리{loaded.packing.length ? ` + 이 여행 준비물 ${loaded.packing.length}개` : ''}</span>
          </span>
          <input type="checkbox" className="switch" checked={withChecklist} onChange={(e) => setWithChecklist(e.target.checked)} />
        </label>
        {err ? <p className="inline-msg error">{err}</p> : null}
      </div>
    </Modal>
  );
}
