import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const sitePages = ['index', 'congo', 'aide', 'confidentialite', 'publicite'];
export async function loadSitePage(name) {
  if (!sitePages.includes(name)) throw new Error('Unknown site page');
  const html = await readFile(path.join(process.cwd(), 'frontend/pages', `${name}.html`), 'utf8');
  const body = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m => '/' + m[1]);
  return {
    name,
    title: html.match(/<title>(.*?)<\/title>/i)?.[1] || 'YAVIYA',
    description: html.match(/name="description"\s+content="([^"]+)"/i)?.[1] || 'Votre marché, à portée de main.',
    bodyClass: body[1].match(/class="([^"]+)"/)?.[1] || '',
    markup: body[2].replace(/<script\b[\s\S]*?<\/script>/gi, ''),
    scripts,
  };
}
