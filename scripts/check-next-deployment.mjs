// Read-only deployment gate. Never creates accounts or orders.
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/check-next-deployment.mjs https://preview.vercel.app');
const base = new URL(input);
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Provide an HTTPS deployment origin without credentials or query parameters.');
base.pathname = '/';
const checks = [
  ['/', 'Next.js page', data => data.includes('__NEXT_DATA__')],
  ['/api/auth/session', 'Account service', data => typeof data === 'object' && data !== null && !data.error],
  ['/api/catalogue?country=CD', 'Public catalogue', data => Array.isArray(data.catalogue) && data.catalogue.length > 0],
];
for (const [route, label, validate] of checks) {
  try {
    const headers = {};
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    const response = await fetch(new URL(route, base), { headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}; ${response.status === 401 || response.status === 403 || response.status >= 300 && response.status < 400 ? 'deployment protection or redirect: authorize preview access' : response.status === 503 ? 'server unavailable: inspect runtime logs and Preview database configuration' : 'endpoint unavailable'}`);
    const body = route === '/' ? await response.text() : await response.json();
    if (!validate(body)) throw new Error('unexpected response; verify deployment/framework or backend data');
    console.log(`${label}: PASS (HTTP ${response.status})`);
  } catch (error) {
    console.error(`${label}: FAIL (${error.name === 'TimeoutError' ? 'request timeout' : error.message})`);
    process.exitCode = 1;
    break;
  }
}
if (!process.exitCode) console.log('Read-only checks passed. Signup, checkout and real PostgreSQL writes still require a separate end-to-end validation.');
