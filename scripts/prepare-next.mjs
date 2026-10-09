import { mkdir, readdir, copyFile, rm } from 'node:fs/promises';
// public/ is generated and ignored by Git. Next bundles styles and React code;
// the old browser scripts are retained only in the legacy source directory.
await rm('public', { recursive: true, force: true });
await mkdir('public', { recursive: true });
for (const name of await readdir('frontend/assets/images')) {
  await copyFile(`frontend/assets/images/${name}`, `public/${name}`);
}
console.log('Images publiques préparées ; aucun script classique, secret ou document privé.');
