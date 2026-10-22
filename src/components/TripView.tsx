import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { unfurl } from '../lib/api';
import { findCover, coverFromMap } from '../lib/covers';
import { asUrl, hostOf, youtubeThumb } from '../lib/detect';
import { timeAgo } from '../lib/prefs';
import {
  checklistProgress,
  dayLabel,
  dDay,
  formatRange,
  linkCategory,
  newEntry,
  NOTE_PROMPTS,
  PHASE_LABEL,
  placeQuery,
  RESEARCH_LABEL,
  researchLinks,
  searchUrl,
  tripLength,
  tripPhase,
  type Phase,
  type ResearchKind,
  type TripEntry,
} from '../lib/trip';
import type { TripApi } from '../lib/tripStore';
import { Icon, type IconName } from './Icon';
import { TripInfoSheet, TripShareSheet } from './TripSheets';
import { Confirm, Modal, Segmented, SyncDot } from './ui';

type Tab = 'plan' | 'check' | 'note' | 'link';
const TABS: { value: Tab; label: string; icon: IconName }[] = [
  { value: 'plan', label: '일정', icon: 'calendar' },
  { value: 'check', label: '체크리스트', icon: 'checklist' },
  { value: 'note', label: '기록', icon: 'journal' },
  { value: 'link', label: '자료', icon: 'video' },
];

export type Notify = (text: string, kind?: 'info' | 'success' | 'error', action?: { label: string; run: () => void }) => void;

export interface TripViewProps {
  api: TripApi;
  me: string;
  setMe: (name: string) => void;
  /** 로그인 사용자만 링크 미리보기(제목·썸네일)를 서버에서 가져올 수 있다 */
  canUnfurl: boolean;
  notify: Notify;
  onBack?: () => void;
  onRemoveTrip?: () => void;
  headerStart?: ReactNode;
}

export function TripView({ api, me, setMe, canUnfurl, notify, onBack, onRemoveTrip, headerStart }: TripViewProps) {
  const { trip, entries, sync } = api;
  const phase = trip ? tripPhase(trip) : 'before';
  const [tab, setTab] = useState<Tab>(phase === 'after' ? 'note' : 'plan');
  const [editing, setEditing] = useState<TripEntry | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  if (!trip) {
    return (
      <div className="empty">
        {sync === 'missing' ? (
          <>
            <p className="empty-title">여행을 찾을 수 없습니다</p>
            <p className="muted-text">링크가 바뀌었거나 공유가 꺼졌을 수 있습니다. 여행을 만든 사람에게 새 링크를 받아 주세요.</p>
          </>
        ) : sync === 'loading' ? (
          <p className="muted-text" aria-busy="true">여행을 불러오는 중…</p>
        ) : (
          <p className="muted-text">연결할 수 없습니다. 네트워크를 확인하세요.</p>
        )}
      </div>
    );
  }

  const fail = () => notify('저장하지 못했습니다. 연결을 확인하세요.', 'error');
  const save = (rows: TripEntry[]) => api.upsert(rows).catch(fail);
  const removeEntry = (e: TripEntry) =>
    api.remove([e.id]).then(
      () => notify('삭제했습니다', 'info', { label: '실행 취소', run: () => void save([e]) }),
      fail,
    );
  const progress = checklistProgress(entries, 'before');
  // 표지가 없으면 여행지 대표 사진을 보여 준다 (저장은 하지 않음)
  const cover = trip.cover ?? coverFromMap(trip.destination);

  return (
    <div className="trip">
      <header className={`trip-hero${cover ? ' has-cover' : ''}`}>
        {cover ? <img className="trip-hero-img" src={cover} alt="" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : null}
        <div className="trip-hero-bar">
          {headerStart}
          {onBack ? (
            <button type="button" className="hero-btn" aria-label="여행 목록으로" onClick={onBack}>
              <Icon name="back" />
            </button>
          ) : null}
          <span className="spacer" />
          <SyncDot state={sync} />
          <button type="button" className="hero-btn" aria-label="여행 정보 편집" onClick={() => setInfoOpen(true)}>
            <Icon name="edit" />
          </button>
          <button type="button" className="hero-btn hero-share" onClick={() => setShareOpen(true)}>
            <Icon name="share" size={18} />
            <span>공유</span>
          </button>
        </div>
        <div className="trip-hero-body">
          <span className="trip-dday">{dDay(trip)}</span>
          <h1>{trip.title || trip.destination || '새 여행'}</h1>
          <p className="trip-hero-meta">
            {trip.destination ? <span>{trip.destination}</span> : null}
            <span>{formatRange(trip)}</span>
            {trip.members.length ? (
              <span>
                <Icon name="users" size={16} /> {trip.members.join(' · ')}
              </span>
            ) : null}
          </p>
          {progress.total ? (
            <div className="trip-progress" aria-label={`준비 ${progress.done}/${progress.total}`}>
              <div className="trip-progress-bar">
                <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <span>
                준비 {progress.done}/{progress.total}
              </span>
            </div>
          ) : null}
        </div>
      </header>

      {trip.summary ? <p className="trip-summary">{trip.summary}</p> : null}

      <div className="trip-tabs">
        <Segmented<Tab>
          label="여행 보기"
          value={tab}
          onChange={setTab}
          options={TABS.map((t) => ({ value: t.value, label: t.label, icon: <Icon name={t.icon} size={18} /> }))}
        />
      </div>

      <section className="trip-panel" aria-label={TABS.find((t) => t.value === tab)!.label}>
        {tab === 'plan' ? <PlanTab trip={trip} entries={entries} onEdit={setEditing} me={me} /> : null}
        {tab === 'check' ? <CheckTab entries={entries} me={me} save={save} onRemove={removeEntry} onEdit={setEditing} /> : null}
        {tab === 'note' ? <NoteTab trip={trip} entries={entries} phase={phase} me={me} onEdit={setEditing} /> : null}
        {tab === 'link' ? <LinkTab trip={trip} entries={entries} me={me} save={save} onRemove={removeEntry} canUnfurl={canUnfurl} notify={notify} /> : null}
      </section>

      {editing ? (
        <EntryEditor
          entry={editing}
          trip={trip}
          days={Math.max(tripLength(trip, entries), 1)}
          isNew={!entries.some((e) => e.id === editing.id)}
          onSave={(e) => {
            void save([e]);
            setEditing(null);
          }}
          onRemove={(e) => {
            void removeEntry(e);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {infoOpen ? (
        <TripInfoSheet
          trip={trip}
          onSave={(patch) => {
            // 표지를 비우고 목적지를 정했으면 그 여행지 대표 사진을 넣는다
            void (patch.cover ? Promise.resolve(patch.cover) : findCover(patch.destination))
              .then((c) => api.update({ ...patch, cover: c ?? null }))
              .then(() => notify('저장했습니다', 'success'), fail);
            setInfoOpen(false);
          }}
          onRemove={onRemoveTrip}
          onClose={() => setInfoOpen(false)}
        />
      ) : null}

      {shareOpen ? <TripShareSheet trip={trip} api={api} me={me} setMe={setMe} notify={notify} onClose={() => setShareOpen(false)} /> : null}
    </div>
  );
}

/* ================================================================== 일정 */

function ResearchChips({ query }: { query: string }) {
  if (!query) return null;
  const kinds: [ResearchKind, IconName][] = [
    ['youtube', 'video'],
    ['blog', 'journal'],
    ['map', 'map'],
  ];
  return (
    <span className="research-chips">
      {kinds.map(([k, icon]) => (
        <a key={k} className={`chip-btn rk-${k}`} href={searchUrl(k, query)} target="_blank" rel="noopener noreferrer" aria-label={`${query} ${RESEARCH_LABEL[k]} 검색`}>
          <Icon name={icon} size={16} />
          {RESEARCH_LABEL[k]}
        </a>
      ))}
    </span>
  );
}

function PlanTab({ trip, entries, onEdit, me }: { trip: NonNullable<TripApi['trip']>; entries: TripEntry[]; onEdit: (e: TripEntry) => void; me: string }) {
  const plans = entries.filter((e) => e.kind === 'plan');
  const days = tripLength(trip, entries);
  const byDay = useMemo(() => {
    const m = new Map<number | null, TripEntry[]>();
    for (const p of plans) {
      const k = p.day && p.day > 0 ? p.day : null;
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    // 같은 날 안에서는 시간 → 입력 순
    for (const list of m.values()) list.sort((a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : 0) || a.sort - b.sort);
    return m;
  }, [plans]);
  const add = (day: number | null) => onEdit(newEntry('plan', { day, author: me }));

  if (!plans.length && !days)
    return (
      <div className="empty">
        <p className="empty-title">아직 일정이 없습니다</p>
        <p className="muted-text">여행 정보에서 날짜를 정하면 일차별 칸이 생깁니다. 여행사 일정표를 붙여넣어 새 여행을 만들면 자동으로 채워집니다.</p>
        <button type="button" className="btn btn-primary" onClick={() => add(1)}>
          <Icon name="plus" size={18} />
          일정 추가
        </button>
      </div>
    );

  const dayNums = Array.from({ length: Math.max(days, 1) }, (_, i) => i + 1);
  return (
    <div className="plan-days">
      {dayNums.map((d) => (
        <DayBlock key={d} title={dayLabel(trip, d)} items={byDay.get(d) ?? []} destination={trip.destination} onEdit={onEdit} onAdd={() => add(d)} />
      ))}
      {byDay.get(null)?.length ? <DayBlock title="날짜 미정" items={byDay.get(null)!} destination={trip.destination} onEdit={onEdit} onAdd={() => add(null)} /> : null}
      <button type="button" className="btn btn-ghost add-day" onClick={() => add(dayNums.length + 1)}>
        <Icon name="plus" size={18} />
        {dayNums.length + 1}일차 일정 추가
      </button>
    </div>
  );
}

function DayBlock({ title, items, destination, onEdit, onAdd }: { title: string; items: TripEntry[]; destination: string; onEdit: (e: TripEntry) => void; onAdd: () => void }) {
  return (
    <section className="day-block">
      <header className="day-head">
        <h3>{title}</h3>
        <button type="button" className="chip-btn" onClick={onAdd}>
          <Icon name="plus" size={16} />
          추가
        </button>
      </header>
      {items.length ? (
        <ol className="plan-list">
          {items.map((p) => (
            <li key={p.id} className="plan-item">
              <span className="plan-time">{p.time || '·'}</span>
              <div className="plan-main">
                <button type="button" className="plan-title title-btn" onClick={() => onEdit(p)}>
                  {p.title || '제목 없음'}
                </button>
                {p.body ? <p className="plan-body">{p.body}</p> : null}
                <div className="plan-tools">
                  <ResearchChips query={placeQuery(p, destination)} />
                  {p.url ? (
                    <a className="link-btn" href={p.url} target="_blank" rel="noopener noreferrer">
                      <Icon name="external" size={16} />
                      {hostOf(p.url)}
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted-text day-empty">비어 있음</p>
      )}
    </section>
  );
}

/* ================================================================== 체크리스트 */

function CheckTab({
  entries,
  me,
  save,
  onRemove,
  onEdit,
}: {
  entries: TripEntry[];
  me: string;
  save: (rows: TripEntry[]) => Promise<unknown>;
  onRemove: (e: TripEntry) => void;
  onEdit: (e: TripEntry) => void;
}) {
  const checks = entries.filter((e) => e.kind === 'check');
  const [newGroup, setNewGroup] = useState('');
  const sections: Phase[] = ['before', 'during', 'after'];

  return (
    <div className="check-sections">
      {sections.map((ph) => {
        const list = checks.filter((c) => c.phase === ph);
        if (!list.length && ph !== 'before') return null;
        const groups = [...new Set(list.map((c) => c.group_name))];
        const p = checklistProgress(entries, ph);
        return (
          <section key={ph} className="check-phase">
            <header className="day-head">
              <h3>{PHASE_LABEL[ph]}</h3>
              {p.total ? (
                <span className="count-pill">
                  {p.done}/{p.total}
                </span>
              ) : null}
            </header>
            {groups.map((g) => (
              <CheckGroup key={g || '_'} name={g} items={list.filter((c) => c.group_name === g)} phase={ph} me={me} save={save} onRemove={onRemove} onEdit={onEdit} />
            ))}
            {ph === 'before' ? (
              <form
                className="add-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newGroup.trim();
                  if (!name) return;
                  void save([newEntry('check', { group_name: name, title: '새 항목', phase: 'before', author: me })]);
                  setNewGroup('');
                }}
              >
                <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="새 분류 만들기 (예: 아이 짐, 공항)" aria-label="새 분류 이름" />
                <button type="submit" className="btn" disabled={!newGroup.trim()}>
                  분류 추가
                </button>
              </form>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function CheckGroup({
  name,
  items,
  phase,
  me,
  save,
  onRemove,
  onEdit,
}: {
  name: string;
  items: TripEntry[];
  phase: Phase;
  me: string;
  save: (rows: TripEntry[]) => Promise<unknown>;
  onRemove: (e: TripEntry) => void;
  onEdit: (e: TripEntry) => void;
}) {
  const [text, setText] = useState('');
  return (
    <div className="check-group">
      {name && name !== PHASE_LABEL[phase] ? <p className="check-group-name">{name}</p> : null}
      <ul className="check-list">
        {items.map((c) => (
          <li key={c.id} className={`check-item${c.done ? ' is-done' : ''}`}>
            <label className="check-hit">
              <input type="checkbox" checked={c.done} onChange={() => void save([{ ...c, done: !c.done, done_by: !c.done ? me || null : null }])} />
              <span className="check-box" aria-hidden="true">
                <Icon name="check" size={16} />
              </span>
              <span className="check-title">{c.title}</span>
            </label>
            {c.done && c.done_by ? <span className="check-by">{c.done_by}</span> : null}
            <button type="button" className="icon-btn small" aria-label={`${c.title} 편집`} onClick={() => onEdit(c)}>
              <Icon name="edit" size={16} />
            </button>
            <button type="button" className="icon-btn small danger" aria-label={`${c.title} 삭제`} onClick={() => onRemove(c)}>
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="add-row inline"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          void save([newEntry('check', { title: t, group_name: name, phase, author: me })]);
          setText('');
        }}
      >
        <Icon name="plus" size={16} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="항목 추가 후 Enter" aria-label={`${name || PHASE_LABEL[phase]}에 항목 추가`} />
      </form>
    </div>
  );
}

/* ================================================================== 기록 */

function NoteTab({ trip, entries, phase, me, onEdit }: { trip: NonNullable<TripApi['trip']>; entries: TripEntry[]; phase: Phase; me: string; onEdit: (e: TripEntry) => void }) {
  const [ph, setPh] = useState<Phase>(phase);
  const notes = entries
    .filter((e) => e.kind === 'note')
    .sort((a, b) => ['before', 'during', 'after'].indexOf(a.phase) - ['before', 'during', 'after'].indexOf(b.phase) || (a.day ?? 0) - (b.day ?? 0) || a.sort - b.sort);
  const start = (title = '') => onEdit(newEntry('note', { title, phase: ph, author: me, day: ph === 'during' && trip.start_date ? Math.max(1, Math.min(tripLength(trip), daysSince(trip.start_date))) : null }));

  return (
    <div className="notes">
      <div className="note-start">
        <Segmented<Phase> label="기록 시점" value={ph} onChange={setPh} options={(['before', 'during', 'after'] as Phase[]).map((p) => ({ value: p, label: PHASE_LABEL[p] }))} />
        <div className="prompt-chips" role="group" aria-label="이런 걸 남겨 보세요">
          {NOTE_PROMPTS[ph].map((p) => (
            <button key={p} type="button" className="chip-btn" onClick={() => start(p)}>
              {p}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => start()}>
          <Icon name="edit" size={18} />
          기록 쓰기
        </button>
      </div>
      {notes.length ? (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id}>
              <button type="button" className="note-card" onClick={() => onEdit(n)}>
                <span className="note-meta">
                  <span className={`phase-badge ph-${n.phase}`}>{PHASE_LABEL[n.phase]}</span>
                  {n.day ? <span>{dayLabel(trip, n.day)}</span> : null}
                </span>
                {n.title ? <strong className="note-title">{n.title}</strong> : null}
                {n.body ? <span className="note-body">{n.body}</span> : null}
                <span className="note-foot">
                  {n.author || '익명'} · {timeAgo(n.updated_at ?? n.created_at ?? null)}
                  {n.url ? (
                    <>
                      {' · '}
                      <Icon name="link" size={16} /> {hostOf(n.url)}
                    </>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-text notes-empty">기대·하루 한 장면·다녀온 소감을 남기면 가족 모두의 여행 기록이 됩니다.</p>
      )}
    </div>
  );
}

function daysSince(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  const now = new Date();
  return Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - start) / 86400000) + 1;
}

/* ================================================================== 자료 */

function LinkTab({
  trip,
  entries,
  me,
  save,
  onRemove,
  canUnfurl,
  notify,
}: {
  trip: NonNullable<TripApi['trip']>;
  entries: TripEntry[];
  me: string;
  save: (rows: TripEntry[]) => Promise<unknown>;
  onRemove: (e: TripEntry) => void;
  canUnfurl: boolean;
  notify: TripViewProps['notify'];
}) {
  const links = entries.filter((e) => e.kind === 'link');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const suggestions = researchLinks(trip);

  async function addLink(e: FormEvent) {
    e.preventDefault();
    const u = asUrl(url);
    if (!u) {
      notify('링크 주소를 확인하세요 (https://… 형식)', 'error');
      return;
    }
    setBusy(true);
    const meta = canUnfurl ? await unfurl(u).catch(() => null) : null;
    setBusy(false);
    void save([
      newEntry('link', {
        url: u,
        title: meta?.title || hostOf(u),
        body: meta?.description ?? '',
        thumbnail: youtubeThumb(u) ?? meta?.image ?? null,
        site_name: meta?.site_name ?? hostOf(u),
        group_name: linkCategory(u),
        author: me,
      }),
    ]);
    setUrl('');
  }

  const save1 = (title: string, link: string, group: string) => void save([newEntry('link', { title, url: link, group_name: group, site_name: hostOf(link), author: me })]).then(() => notify('자료에 저장했습니다', 'success'));

  return (
    <div className="links">
      <form className="add-row" onSubmit={(e) => void addLink(e)}>
        <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="유튜브·블로그·지도 링크 붙여넣기" aria-label="자료 링크" />
        <button type="submit" className="btn btn-primary" disabled={!url.trim() || busy} aria-busy={busy}>
          {busy ? '불러오는 중…' : '저장'}
        </button>
      </form>

      {links.length ? (
        <ul className="link-grid">
          {links.map((l) => (
            <li key={l.id} className="link-card">
              <a href={l.url ?? '#'} target="_blank" rel="noopener noreferrer" className="link-card-main">
                <span className="link-thumb">
                  {l.thumbnail ? <img src={l.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Icon name={l.group_name === '유튜브' ? 'video' : 'link'} size={24} />}
                </span>
                <span className="link-meta">
                  <span className={`phase-badge${l.group_name === '여행사' ? ' ph-source' : ''}`}>{l.group_name || '웹'}</span>
                  <strong>{l.title || hostOf(l.url)}</strong>
                  <span className="muted-text">
                    {l.site_name || hostOf(l.url)}
                    {l.author ? ` · ${l.author}` : ''}
                  </span>
                </span>
              </a>
              <button type="button" className="icon-btn small danger" aria-label={`${l.title} 삭제`} onClick={() => onRemove(l)}>
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="research">
        <header className="day-head">
          <h3>추천 검색 링크</h3>
        </header>
        {suggestions.length ? (
          <ul className="research-list">
            {suggestions.map((s) => (
              <li key={s.url}>
                <a className={`research-link rk-${s.kind}`} href={s.url} target="_blank" rel="noopener noreferrer">
                  <span className="research-kind">{RESEARCH_LABEL[s.kind]}</span>
                  <span className="research-label">{s.label}</span>
                  <span className="muted-text research-q">{s.query}</span>
                </a>
                <button type="button" className="icon-btn small" aria-label={`'${s.query}' 검색 링크를 자료에 저장`} title="자료에 저장" onClick={() => save1(`${RESEARCH_LABEL[s.kind]} 검색: ${s.query}`, s.url, RESEARCH_LABEL[s.kind])}>
                  <Icon name="pin" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">여행 정보에 목적지를 적으면 유튜브 브이로그·블로그 후기·날씨 검색 링크가 만들어집니다.</p>
        )}
        <form className="add-row" onSubmit={(e) => e.preventDefault()}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`직접 검색 (예: ${trip.destination || '오사카'} 유니버설 팁)`} aria-label="검색어" />
        </form>
        {q.trim() ? (
          <div className="research-custom">
            <ResearchChips query={q.trim()} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

/* ================================================================== 항목 편집 */

function EntryEditor({
  entry,
  trip,
  days,
  isNew,
  onSave,
  onRemove,
  onClose,
}: {
  entry: TripEntry;
  trip: NonNullable<TripApi['trip']>;
  days: number;
  isNew: boolean;
  onSave: (e: TripEntry) => void;
  onRemove: (e: TripEntry) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(entry);
  const [confirm, setConfirm] = useState(false);
  const set = (p: Partial<TripEntry>) => setD((x) => ({ ...x, ...p }));
  const kindLabel = { plan: '일정', check: '체크 항목', note: '기록', link: '자료' }[d.kind];
  const dayOptions = Array.from({ length: Math.max(days, d.day ?? 0) + (d.kind === 'plan' ? 1 : 0) }, (_, i) => i + 1);

  const daySelect = (
    <label className="field">
      <span className="field-label">날짜</span>
      <span className="select select-field">
        <select value={d.day ?? ''} onChange={(e) => set({ day: e.target.value ? Number(e.target.value) : null })}>
          <option value="">{d.kind === 'note' ? '날짜 없음' : '날짜 미정'}</option>
          {dayOptions.map((n) => (
            <option key={n} value={n}>
              {dayLabel(trip, n)}
            </option>
          ))}
        </select>
        <Icon name="chevron" size={16} />
      </span>
    </label>
  );

  return (
    <Modal
      title={isNew ? `${kindLabel} 추가` : `${kindLabel} 편집`}
      onClose={onClose}
      footer={
        <div className="action-bar">
          {!isNew ? (
            <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirm(true)}>
              <Icon name="trash" size={18} />
              삭제
            </button>
          ) : null}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" form="entry-form" className="btn btn-primary" disabled={!d.title.trim() && !d.body.trim()}>
            저장
          </button>
        </div>
      }
    >
      <form
        id="entry-form"
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!d.title.trim() && !d.body.trim()) return;
          onSave({ ...d, title: d.title.trim(), url: d.url ? (asUrl(d.url) ?? d.url) : null });
        }}
      >
        {d.kind === 'note' ? (
          <Segmented<Phase> label="기록 시점" value={d.phase} onChange={(phase) => set({ phase })} options={(['before', 'during', 'after'] as Phase[]).map((p) => ({ value: p, label: PHASE_LABEL[p] }))} />
        ) : null}
        {d.kind === 'plan' ? (
          <div className="field-pair">
            {daySelect}
            <label className="field">
              <span className="field-label">시간</span>
              <input type="time" value={d.time} onChange={(e) => set({ time: e.target.value })} />
            </label>
          </div>
        ) : null}
        <label className="field">
          <span className="field-label">{d.kind === 'plan' ? '장소 · 할 일' : d.kind === 'note' ? '제목' : '항목'}</span>
          <input data-autofocus value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={d.kind === 'plan' ? '예: 도톤보리 저녁' : d.kind === 'note' ? '예: 가장 좋았던 순간' : ''} />
        </label>
        {d.kind === 'check' ? (
          <label className="field">
            <span className="field-label">분류</span>
            <input value={d.group_name} onChange={(e) => set({ group_name: e.target.value })} />
          </label>
        ) : null}
        {d.kind === 'note' ? daySelect : null}
        {d.kind !== 'check' ? (
          <label className="field">
            <span className="field-label">{d.kind === 'note' ? '내용' : '메모'}</span>
            <textarea rows={d.kind === 'note' ? 8 : 3} value={d.body} onChange={(e) => set({ body: e.target.value })} placeholder={d.kind === 'note' ? '그때의 장면, 느낌, 함께한 사람…' : '예약 번호, 식사, 이동 방법'} />
          </label>
        ) : null}
        {d.kind !== 'check' ? (
          <label className="field">
            <span className="field-label">
              링크<em>선택 · 지도, 예약, 사진 앨범</em>
            </span>
            <input type="url" inputMode="url" value={d.url ?? ''} onChange={(e) => set({ url: e.target.value || null })} placeholder="https://" />
          </label>
        ) : null}
        {d.kind === 'plan' && d.title.trim() ? (
          <div className="field">
            <span className="field-label">찾아보기</span>
            <ResearchChips query={placeQuery(d, trip.destination)} />
          </div>
        ) : null}
      </form>
      {confirm ? <Confirm title="삭제" message={`'${d.title || kindLabel}'을(를) 삭제합니다. 모든 멤버 화면에서 사라집니다.`} confirmLabel="삭제" danger onConfirm={() => onRemove(entry)} onClose={() => setConfirm(false)} /> : null}
    </Modal>
  );
}
