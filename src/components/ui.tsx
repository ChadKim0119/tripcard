import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

/* ------------------------------------------------------------------ Modal
   MapStone DialogHeader 규칙: Esc 닫기, focus trap, 닫으면 시작 버튼으로 focus 복귀,
   헤더 고정 · 본문 별도 스크롤. 모바일(<640px)에서는 하단 시트로 표시한다. */
export function Modal({
  title,
  onClose,
  children,
  footer,
  size = 'md',
  headerExtra,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  headerExtra?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 열린 자동완성(/ 명령 목록 등)이 있으면 그것만 닫히게 둔다
        if ((e.target as HTMLElement | null)?.getAttribute?.('aria-expanded') === 'true') return;
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === 'Tab' && el) {
        const f = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null);
        if (!f.length) return;
        const a = f[0];
        const z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.classList.remove('modal-open');
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="modal-root">
      <div className="scrim" onClick={onClose} />
      <div ref={panel} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-grip" aria-hidden="true" />
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          {headerExtra}
          <button type="button" className="icon-btn" data-close aria-label="닫기" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Confirm */
export function Confirm({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <div className="action-bar">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            data-autofocus
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="muted-text">{message}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Toast
   MapStone Toast: role=status, 오류는 원인과 다음 행동을 함께. 실행 취소 액션 지원. */
export interface ToastMsg {
  id: number;
  text: string;
  kind?: 'info' | 'success' | 'error';
  action?: { label: string; run: () => void };
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (text: string, opts: Omit<ToastMsg, 'id' | 'text'> = {}) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, text, ...opts }]);
      window.setTimeout(() => dismiss(id), opts.action ? 6000 : opts.kind === 'error' ? 6000 : 2600);
    },
    [dismiss],
  );
  return { toasts, show, dismiss };
}

export function Toasts({ toasts, dismiss }: { toasts: ToastMsg[]; dismiss: (id: number) => void }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind ?? 'info'}`}>
          {t.kind === 'success' ? <Icon name="check" size={18} /> : null}
          <span>{t.text}</span>
          {t.action ? (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Segmented */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const i = options.findIndex((x) => x.value === value);
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              onChange(options[(i + 1) % options.length].value);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              onChange(options[(i - 1 + options.length) % options.length].value);
            }
          }}
          tabIndex={value === o.value ? 0 : -1}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/** 클립보드 복사 — iOS Safari 의 비보안 컨텍스트 대비 폴백 포함 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** 동기화 상태 점 — 사이드바·상단바·여행 화면 공용 */
export function SyncDot({ state }: { state: string }) {
  const label = state === 'synced' ? '동기화됨' : state === 'loading' ? '불러오는 중' : state === 'missing' ? '찾을 수 없음' : state === 'offline' ? '오프라인 — 저장된 사본 표시 중' : '동기화 오류';
  return (
    <span className={`sync-dot sync-${state}`} title={label} role="img" aria-label={label}>
      <Icon name="cloud" size={16} />
    </span>
  );
}
