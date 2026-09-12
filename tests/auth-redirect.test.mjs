import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, mocks = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, require: (id) => mocks[id], URL, TextEncoder, process });
  return exports;
}
const routing = load('src/lib/auth-redirect.ts');

test('admin login always goes to admin; users retain valid dashboard callbacks', () => {
  for (const callback of [null, '/scheduler', '/reviews', '//example.com']) {
    assert.equal(routing.getLoginDestination('ADMIN', callback), '/admin');
  }
  assert.equal(routing.getLoginDestination('USER'), '/scheduler');
  assert.equal(routing.getLoginDestination('USER', '/reviews?sort=newest#compare'), '/reviews?sort=newest#compare');
});

test('external, script, admin and login callbacks fall back to scheduler', () => {
  for (const callback of ['https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)', '/admin', '/login', '/reviews/../admin']) {
    assert.equal(routing.getLoginDestination('USER', callback), '/scheduler');
  }
});

test('existing sessions land by role; inactive and ordinary users cannot enter admin', async () => {
  let user;
  const { proxy } = load('src/proxy.ts', {
    '@/lib/auth-redirect': routing,
    jose: { jwtVerify: async () => ({ payload: user }) },
    'next/server': { NextResponse: { redirect: (url) => url.pathname + url.search, next: () => 'next' } },
  });
  const request = (path) => ({ url: `https://local.invalid${path}`, nextUrl: new URL(`https://local.invalid${path}`), cookies: { get: () => user ? { value: 'mock-session' } : undefined } });
  for (const role of ['ADMIN', 'USER']) {
    user = { role, status: 'ACTIVE' };
    for (const path of ['/', '/login', '/register', '/admin/login']) {
      assert.equal(await proxy(request(path)), role === 'ADMIN' ? '/admin' : '/scheduler');
    }
    assert.equal(await proxy(request('/admin')), role === 'ADMIN' ? 'next' : '/admin/login');
  }
  user = { role: 'ADMIN', status: 'DISABLED' };
  assert.equal(await proxy(request('/admin')), '/admin/login');
  user = null;
  assert.equal(await proxy(request('/')), '/login');
  assert.equal(await proxy(request('/admin')), '/admin/login');
});
