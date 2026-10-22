import { useMemo, useState } from 'react';
import { AGENTS, APP_VERSION, REVISIONS, type AgentId } from '../lib/revisions';
import { Modal } from './ui';

export function AgentTag({ id }: { id: AgentId }) {
  return (
    <span className={`agent-tag agent-${id}`}>
      <span className="agent-dot" aria-hidden="true" />
      {AGENTS[id]?.label ?? id}
    </span>
  );
}

/** MapStone/RevisionEntry: 버전·작업 에이전트·제목·작업 목록. 최신 항목은 Latest 표시. */
export function RevisionHistory({ onClose }: { onClose: () => void }) {
  const used = useMemo(() => [...new Set(REVISIONS.flatMap((r) => r.agents))], []);
  const [filter, setFilter] = useState<AgentId | 'all'>('all');
  const list = filter === 'all' ? REVISIONS : REVISIONS.filter((r) => r.agents.includes(filter));

  return (
    <Modal title="리비전 히스토리" onClose={onClose} size="lg">
      <div className="rev">
        {used.length > 1 ? (
          <div className="rev-filter" role="group" aria-label="에이전트로 거르기">
            <button type="button" className={`filter-chip${filter === 'all' ? ' is-on' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              전체 <span>{REVISIONS.length}</span>
            </button>
            {used.map((a) => (
              <button key={a} type="button" className={`filter-chip${filter === a ? ' is-on' : ''}`} aria-pressed={filter === a} onClick={() => setFilter(a)}>
                {AGENTS[a].label} <span>{REVISIONS.filter((r) => r.agents.includes(a)).length}</span>
              </button>
            ))}
          </div>
        ) : null}
        <ol className="rev-list">
          {list.map((r) => (
            <li key={r.version} className={`rev-entry${r.version === APP_VERSION ? ' is-latest' : ''}`}>
              <div className="rev-head">
                <span className="rev-version">v{r.version}</span>
                {r.version === APP_VERSION ? <span className="badge badge-info">현재</span> : null}
                <time className="rev-date" dateTime={r.date}>
                  {r.date.replaceAll('-', '.')}
                </time>
              </div>
              <div className="rev-agents">
                {r.agents.map((a) => (
                  <AgentTag key={a} id={a} />
                ))}
              </div>
              <h3 className="rev-title">{r.title}</h3>
              <ul className="rev-changes">
                {r.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </Modal>
  );
}
