import { mkdir, readdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('public', { recursive: true });
for (const folder of ['frontend/src', 'frontend/styles', 'frontend/assets/images']) {
  for (const name of await readdir(folder)) await copyFile(`${folder}/${name}`, `public/${name}`);
}
const config = JSON.parse(await readFile('backend/data/market-config.json', 'utf8'));
await writeFile('public/market-config.js', `window.YAVIYA_MARKET_CONFIG = ${JSON.stringify(config)};\n`);
console.log('Assets Next.js préparés sans secrets ni documents privés.');
