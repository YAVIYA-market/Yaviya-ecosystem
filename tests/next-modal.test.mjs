import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { loadSitePage } from '../lib/legacy-pages.js';

test('Next.js purchase windows remain visible while the background catalogue is hidden', async () => {
  const page = await loadSitePage('index');
  const css = await readFile(new URL('../frontend/styles/style.css', import.meta.url), 'utf8');
  const dom = new JSDOM(`<html><head><style>${css}</style></head><body><div id="__next"><div id="yaviya-marketplace">${page.markup}</div></div></body></html>`);
  try {
    const w = dom.window;
    w.document.body.classList.add('window-open');
    const modal = w.document.querySelector('#modal');
    modal.setAttribute('open', '');
    modal.classList.add('full-page');
    assert.notEqual(w.getComputedStyle(w.document.querySelector('#__next')).visibility, 'hidden');
    assert.notEqual(w.getComputedStyle(w.document.querySelector('#yaviya-marketplace')).visibility, 'hidden');
    assert.equal(w.getComputedStyle(modal).visibility, 'visible');
    assert.equal(w.getComputedStyle(w.document.querySelector('header')).visibility, 'hidden');
    w.document.body.classList.remove('window-open');
    assert.equal(w.getComputedStyle(w.document.querySelector('header')).visibility, 'visible');
  } finally { dom.window.close(); }
});
