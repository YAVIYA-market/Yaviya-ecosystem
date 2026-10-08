export const SITE_URL = 'https://yaviyaecosystem.vercel.app/';
export function classifyUrl(value: string): 'internal' | 'external' | 'blocked' {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.origin === new URL(SITE_URL).origin) return 'internal';
    if (['https:', 'mailto:', 'tel:'].includes(url.protocol)) return 'external';
  } catch { /* Invalid URLs must never load. */ }
  return 'blocked';
}
