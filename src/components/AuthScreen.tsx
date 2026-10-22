import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Segmented } from './ui';

type Mode = 'signin' | 'signup' | 'reset';

function Brand() {
  return (
    <div className="brand brand-lg">
      <img src="/icon.svg" alt="" width={40} height={40} />
      <span>트립카드</span>
    </div>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  // 만료·재사용된 메일 링크로 들어오면 해시에 error_code 가 붙어 온다.
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(() =>
    /error_code=otp_expired/.test(window.location.hash)
      ? { kind: 'error', text: '메일 링크가 만료됐거나 이미 사용됐습니다. 로그인하거나 비밀번호를 재설정하세요.' }
      : null,
  );

  function go(m: Mode) {
    setMode(m);
    setMsg(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg({
          kind: 'error',
          text: /confirm/i.test(error.message)
            ? '이메일 인증이 아직 안 됐습니다. 메일함의 확인 링크를 누른 뒤 다시 로그인하세요.'
            : '이메일 또는 비밀번호가 맞지 않습니다. 비밀번호가 기억나지 않으면 아래에서 재설정하세요.',
        });
      }
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) setMsg({ kind: 'error', text: error.message.includes('Password') ? '비밀번호는 6자 이상이어야 합니다.' : `가입하지 못했습니다: ${error.message}` });
      // 이미 가입된 이메일이면 Supabase 는 오류 대신 identities 가 빈 사용자를 돌려주고 메일을 보내지 않는다.
      else if (data.user && !data.user.identities?.length) {
        setMode('signin');
        setMsg({ kind: 'info', text: '이미 가입된 이메일입니다. 로그인하세요. 비밀번호가 기억나지 않으면 아래에서 재설정할 수 있습니다.' });
      } else if (!data.session) setMsg({ kind: 'info', text: `${email} 로 확인 메일을 보냈습니다. 링크를 누르면 바로 로그인됩니다.` });
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      setMsg(
        error
          ? { kind: 'error', text: /rate|security/i.test(error.message) ? '메일 요청이 너무 잦습니다. 잠시 후 다시 시도하세요.' : `메일을 보내지 못했습니다: ${error.message}` }
          : { kind: 'info', text: `${email} 로 비밀번호 재설정 메일을 보냈습니다. 링크를 누르면 새 비밀번호를 정하는 화면이 열립니다.` },
      );
    }
    setBusy(false);
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <Brand />
        {mode === 'reset' ? (
          <div className="field">
            <h1 className="auth-title">비밀번호 재설정</h1>
            <p className="muted-text">가입한 이메일로 재설정 링크를 보내 드립니다.</p>
          </div>
        ) : (
          <>
            <p className="muted-text">여행사 링크 하나로 여행 카드를 만들고, 가족과 함께 일정·준비물·기록을 채워요.</p>
            <Segmented
              label="로그인 방식"
              value={mode}
              onChange={go}
              options={[
                { value: 'signin', label: '로그인' },
                { value: 'signup', label: '처음 사용' },
              ]}
            />
          </>
        )}
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span className="field-label">이메일</span>
            <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {mode !== 'reset' ? (
            <label className="field">
              <span className="field-label">비밀번호</span>
              <input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          ) : null}
          {msg ? (
            <p className={`inline-msg ${msg.kind}`} role={msg.kind === 'error' ? 'alert' : 'status'}>
              {msg.text}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? '확인 중…' : mode === 'signin' ? '로그인' : mode === 'signup' ? '계정 만들기' : '재설정 메일 받기'}
          </button>
          {mode === 'signin' ? (
            <button type="button" className="link-btn auth-link" onClick={() => go('reset')}>
              비밀번호를 잊으셨나요?
            </button>
          ) : mode === 'reset' ? (
            <button type="button" className="link-btn auth-link" onClick={() => go('signin')}>
              로그인으로 돌아가기
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}

/** 재설정 메일 링크로 들어왔을 때 (PASSWORD_RECOVERY) 새 비밀번호를 정한다. */
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('두 비밀번호가 다릅니다.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(/different|same/i.test(err.message) ? '이전과 다른 비밀번호를 입력하세요.' : `바꾸지 못했습니다: ${err.message}`);
    else onDone();
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <Brand />
        <div className="field">
          <h1 className="auth-title">새 비밀번호 정하기</h1>
          <p className="muted-text">앞으로 모든 기기에서 이 비밀번호로 로그인합니다.</p>
        </div>
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span className="field-label">새 비밀번호</span>
            <input type="password" autoComplete="new-password" minLength={6} required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">한 번 더</span>
            <input type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error ? (
            <p className="inline-msg error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? '저장 중…' : '비밀번호 저장하고 시작'}
          </button>
        </form>
      </div>
    </div>
  );
}
