const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

/** 붙여넣은 문자열이 URL 하나뿐인지. 스킴이 없으면 붙여 준다. */
export function asUrl(input: string): string | null {
  const s = input.trim();
  if (!s || /\s/.test(s) || !URL_RE.test(s)) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

/** 문자열 안에서 첫 URL 을 찾는다 (공유 시트의 text 필드처럼 섞여 오는 경우). */
export function findUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0] : null;
}

export function hostOf(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^(www|m|music)\./, '');
    if (h === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/);
      if (m) return m[2];
    }
  } catch {
    /* not a url */
  }
  return null;
}

export function youtubeThumb(url: string | null): string | null {
  const id = youtubeId(url);
  // mqdefault 는 16:9 (hqdefault 는 위아래 검은 띠가 있는 4:3)
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}
