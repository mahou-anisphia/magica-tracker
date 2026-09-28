const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:', 'blob:']);

/** A URL that parses and can't run script when clicked. */
export function isSafeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return !BLOCKED_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
}

/**
 * Turn what someone typed into a URL, or null if it can't be one.
 * "docs.example.com/x" becomes "https://docs.example.com/x".
 */
export function normalizeUrlInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Only "scheme://…" and mailto: count as having a scheme. "localhost:8080" is a host.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return isSafeUrl(trimmed) ? trimmed : null;
  }
  return withHttps(trimmed);
}

function withHttps(s: string): string | null {
  const candidate = `https://${s}`;
  try {
    const u = new URL(candidate);
    return u.hostname.includes('.') || u.hostname === 'localhost' ? candidate : null;
  } catch {
    return null;
  }
}

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
// A bare host needs a real-looking TLD, so "v2.1" in a title isn't taken for a link.
const BARE_HOST_RE = /^(localhost(:\d+)?|[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d+)?)([/?#]|$)/i;
const SEPARATORS_RE = /[\s\-–—:|·]+$/;

/**
 * One line in, one resource out: "Threat model v2 https://docs.example.com/tm".
 * The link can sit anywhere; the rest is the header. A bare link gets a header
 * made from its last path segment ("threat-model-v2" → "Threat model v2").
 */
export function parseResourceInput(text: string): { header: string; url: string } | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  let index = tokens.findIndex((t) => SCHEME_RE.test(t) || /^mailto:/i.test(t));
  if (index < 0) index = tokens.findLastIndex((t) => BARE_HOST_RE.test(t));
  if (index < 0) return null;
  const url = normalizeUrlInput(tokens[index]!);
  if (!url) return null;
  const header = tokens
    .filter((_, i) => i !== index)
    .join(' ')
    .replace(SEPARATORS_RE, '')
    .replace(/^[\s\-–—:|·]+/, '');
  return { header: header || headerFromUrl(url), url };
}

export function headerFromUrl(value: string): string {
  try {
    const u = new URL(value);
    const segment = u.pathname.split('/').filter(Boolean).pop();
    if (!segment) return u.hostname.replace(/^www\./, '') || value;
    const words = decodeURIComponent(segment)
      .replace(/\.[a-z0-9]{1,5}$/i, '')
      .replace(/[-_+]+/g, ' ')
      .trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : u.hostname;
  } catch {
    return value;
  }
}

/** "docs.example.com/threat/model-v2" — host without www, then a trimmed path. */
export function shortUrl(value: string, max = 48): string {
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return truncate(value, max);
    }
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    return truncate(host + path, max);
  } catch {
    return truncate(value, max);
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
