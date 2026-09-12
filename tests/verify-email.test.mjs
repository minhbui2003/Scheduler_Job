import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness({ status = 'PENDING_VERIFICATION', used = false, expired = false, missing = false, concurrentStatus } = {}) {
  let writes = 0;
  const user = { _id: 'user-id', status, emailVerifiedAt: status === 'ACTIVE' ? new Date() : null };
  const token = { userId: user._id, usedAt: used ? new Date() : null, expiresAt: new Date(Date.now() + (expired ? -60000 : 60000)), save: async () => { writes++; } };
  const mocks = {
    '@/lib/mongodb': { default: async () => {} },
    '@/models/User': { default: {
      findById: async () => user,
      findOneAndUpdate: async (query, update) => {
        if (concurrentStatus) {
          user.status = concurrentStatus;
          user.emailVerifiedAt = concurrentStatus === 'ACTIVE' ? new Date() : null;
        }
        if (query.status !== user.status) return null;
        writes++;
        Object.assign(user, update.$set);
        return user;
      },
    } },
    '@/models/VerificationToken': { default: { findOne: async () => missing ? null : token } },
    '@/lib/api-utils': {
      successResponse: (data) => ({ status: 200, data }),
      errorResponse: (error, status) => ({ status, error }),
      handleApiError: (error) => { throw error; },
    },
  };
  const source = ts.transpileModule(fs.readFileSync('src/app/api/auth/verify-email/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (id) => mocks[id], URL });
  return { verify: () => exports.GET({ url: `https://local.invalid/api/auth/verify-email?token=${'a'.repeat(64)}` }), writes: () => writes, user };
}

test('verification succeeds again when the same link is opened twice', async () => {
  const h = harness();
  assert.equal((await h.verify()).status, 200);
  const writes = h.writes();
  assert.equal((await h.verify()).status, 200);
  assert.equal(h.writes(), writes);
  assert.equal(h.user.status, 'ACTIVE');
});

test('used links for verified accounts succeed without mutations', async () => {
  const h = harness({ status: 'ACTIVE', used: true, expired: true });
  assert.equal((await h.verify()).status, 200);
  assert.equal(h.writes(), 0);
});

test('blocked/deleted accounts and invalid pending tokens cannot activate', async () => {
  for (const [options, code] of [[{ status: 'DISABLED' }, 403], [{ status: 'DELETED' }, 403], [{ used: true }, 400], [{ expired: true }, 400], [{ missing: true }, 400]]) {
    const h = harness(options);
    assert.equal((await h.verify()).status, code);
    assert.equal(h.writes(), 0);
  }
});

test('concurrent verification succeeds; concurrent account disabling remains blocked', async () => {
  for (const [concurrentStatus, code] of [['ACTIVE', 200], ['DISABLED', 403]]) {
    const h = harness({ concurrentStatus });
    assert.equal((await h.verify()).status, code);
    assert.equal(h.writes(), 0);
    assert.equal(h.user.status, concurrentStatus);
  }
});
