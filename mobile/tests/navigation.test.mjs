import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyUrl } from '../src/lib/navigation.ts';
test('same-origin navigation stays in app; outside links leave it', () => {
  assert.equal(classifyUrl('https://yaviyaecosystem.vercel.app/congo.html'), 'internal');
  assert.equal(classifyUrl('https://example.com/'), 'external');
  assert.equal(classifyUrl('mailto:partenariat@yaviya.cd'), 'external');
  assert.equal(classifyUrl('tel:+243810000000'), 'external');
});
test('unsafe schemes and lookalike hosts cannot enter the app', () => {
  for (const url of ['javascript:alert(1)', 'file:///secret', 'http://yaviyaecosystem.vercel.app/', 'garbage']) assert.equal(classifyUrl(url), 'blocked');
  assert.equal(classifyUrl('https://yaviyaecosystem.vercel.app.evil.example/'), 'external');
});
