/**
 * 리비전 히스토리 — 앱의 버전 버튼을 누르면 보이는 변경 기록.
 * 새 변경을 배포할 때마다 맨 앞에 항목을 추가한다 (맨 앞 항목의 version 이 앱 버전이 된다).
 * agent 는 실제로 수정한 주체를 적는다. 목록에 없는 에이전트는 AGENTS 에 색과 함께 추가한다.
 */

export type AgentId = 'claude-code' | 'codex' | 'cursor' | 'gemini' | 'human';

/** 색은 MapStone 팔레트에서 고른다 (tokens.css 의 --ma-agent-* 와 짝). */
export const AGENTS: Record<AgentId, { label: string }> = {
  'claude-code': { label: 'Claude Code' },
  codex: { label: 'Codex' },
  cursor: { label: 'Cursor' },
  gemini: { label: 'Gemini' },
  human: { label: '직접 수정' },
};

export interface Revision {
  version: string;
  date: string; // YYYY-MM-DD
  agents: AgentId[];
  title: string;
  changes: string[];
}

export const REVISIONS: Revision[] = [
  {
    version: '1.3.0',
    date: '2026-10-22',
    agents: ['claude-code'],
    title: '여행 카드 표지 사진',
    changes: [
      '모두투어 상품 링크는 상품 사진 갤러리의 대표 사진을 표지로 가져옴',
      '상품 사진이 없으면 여행지 대표 명소 사진을 표지로 (오사카성, 성산일출봉, 에펠탑 등 112곳)',
      '목록에 없는 여행지는 위키백과에서 그 지역 사진을 찾아 표지로',
      '표지가 없던 기존 여행 카드에도 여행지 사진 표시',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-10-22',
    agents: ['claude-code'],
    title: '여행사 일정 화면 다듬기',
    changes: [
      '식사·항공·이동 안내 줄에는 유튜브·블로그·지도 검색 버튼을 숨기고, 숙박은 호텔 이름으로 검색',
      '여행사 공통 홍보 배너는 표지 사진으로 쓰지 않음',
      '상품명 머리 태그를 뺀 뒤 목적지를 찾아 더 정확하게 인식 (예: 북해도)',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-22',
    agents: ['claude-code'],
    title: '모두투어 상품 링크에서 일정 그대로 가져오기',
    changes: [
      '모두투어 패키지 링크를 넣으면 출발·도착일, 항공편, 일차별 관광지·식사·숙박을 여행사 일정 그대로 가져옴',
      '상품명 앞의 [즉시할인] 같은 태그는 여행 이름에서 뺌',
      '제목 자리에 상품코드만 있는 여행사 페이지는 상품명을 제목으로 사용',
      '북해도·오타루·노보리베츠 등 목적지 인식 추가',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-22',
    agents: ['claude-code'],
    title: '로그인 없이 바로 쓰기',
    changes: [
      '로그인 없이 여행 카드를 만들고 공유 링크로 함께 수정',
      '내가 만들거나 링크로 연 여행은 이 기기의 내 여행 목록에 자동 저장',
      '로그인은 선택 — 하면 여러 기기에서 목록이 이어지고 공유 끄기·새 링크 가능',
      '링크로 처음 들어오면 체크·기록에 표시할 이름을 한 번 물어봄',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-22',
    agents: ['claude-code'],
    title: '트립카드 첫 배포 — MyArchive 에서 독립한 여행 앱',
    changes: [
      '여행사 일정·상품 링크(또는 일정표 텍스트)로 제목·사진·일차별 일정이 담긴 여행 카드 생성',
      '일정 · 체크리스트 · 기록 · 자료 탭, D-day 와 준비 진행률',
      '국내·해외 기본 체크리스트, 누가 체크했는지 표시',
      '여행 전·중·다녀온 후 단계별 기록 질문',
      '목적지·일정마다 유튜브·블로그·지도·날씨 검색 링크, 자료 링크 저장',
      '공유 링크로 로그인 없이 두 가족·멤버가 함께 수정, 모든 기기에 실시간 반영',
    ],
  },
];

export const APP_VERSION = REVISIONS[0].version;
