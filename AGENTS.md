# 트립카드 작업 규칙 (모든 AI 에이전트·사람 공통)

## 리비전 히스토리 기록 — 필수
설정 → 버전 버튼을 누르면 `src/lib/revisions.ts` 의 `REVISIONS` 가 보인다.
사용자에게 배포되는 변경을 할 때마다 **맨 앞에** 항목을 하나 추가한다.

- `version`: 기능 추가는 minor(+0.1.0), 수정만 있으면 patch(+0.0.1). 맨 앞 항목이 앱 버전이 된다.
- `agents`: 실제로 수정한 주체 — `claude-code`, `codex`, `cursor`, `gemini`, `human`.
  새 에이전트면 `AGENTS` 와 `src/styles/tokens.css` 의 `--ma-agent-*` 색(라이트·다크)을 함께 추가한다.
- `title` 한 줄, `changes` 는 사용자 관점의 짧은 문장 목록.

## 디자인
- 시각 값은 MapStone 토큰(`src/styles/mapstone-tokens.css`, 수정 금지)과 확장(`src/styles/tokens.css`)만 쓴다.
- 접근성: WCAG 2.1 AA, 터치 영역 44px.

## 데이터
- 여행 항목(`trip_entries`)은 공유 토큰 RPC 로만 읽고 쓴다. 테이블 정책을 열지 않는다.
- 삭제는 `deleted_at` 표시(실행 취소·동기화 안전). 스키마 변경은 `supabase/migrations/` 에 새 파일로.

## 확인
`npm run build` · `npm test` 통과 후 커밋한다.
