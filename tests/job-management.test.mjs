import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const userId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const jobId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const interviewId = 'cccccccccccccccccccccccc';
function load(file, mocks = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { exports, require: (id) => id in mocks ? mocks[id] : require(id), URL });
  return exports;
}
const schemas = load('src/lib/validations.ts');
function harness({ missing = false, failCleanup = false } = {}) {
  const calls = [];
  const record = { _id: jobId, companyId: 'dddddddddddddddddddddddd', position: 'Developer', jdText: 'Keep this JD text' };
  const mutation = (name) => async (query, update) => {
    calls.push({ name, query, update });
    assert.equal(query.userId, userId);
    if (failCleanup && name === 'notifications.deleteMany') throw new Error('Database unavailable');
    return record;
  };
  const model = (name) => ({
    findOne: async (query) => { assert.equal(query.userId, userId); return missing ? null : record; },
    find: () => ({ select: () => ({ lean: async () => [{ _id: interviewId }] }) }),
    deleteMany: mutation(`${name}.deleteMany`),
    deleteOne: mutation(`${name}.deleteOne`),
    updateMany: mutation(`${name}.updateMany`),
    findOneAndUpdate: (query, update) => ({ lean: () => mutation(`${name}.update`)(query, update) }),
  });
  const mocks = {
    '@/lib/mongodb': async () => {},
    '@/lib/auth': { requireAuth: async () => ({ id: userId }) },
    '@/lib/validations': schemas,
    '@/lib/api-utils': { successResponse: (data) => ({ status: 200, data }), errorResponse: (error, status) => ({ status, error }), handleApiError: () => ({ status: 500 }) },
    '@/models/Application': model('applications'), '@/models/Interview': model('interviews'),
    '@/models/Company': model('companies'), '@/models/Activity': model('activities'),
    '@/models/InterviewReview': model('reviews'), '@/models/Notification': model('notifications'),
    '@/services/notification.service': {},
  };
  return { calls, jobs: load('src/app/api/applications/[id]/route.ts', mocks), interviews: load('src/app/api/interviews/[id]/route.ts', mocks) };
}
const context = (id = jobId) => ({ params: Promise.resolve({ id }) });

test('deleting a job cleans reviews, all notifications, activities and interviews before the job', async () => {
  const h = harness();
  assert.equal((await h.jobs.DELETE({}, context())).status, 200);
  assert.deepEqual(h.calls.map((c) => c.name), ['notifications.deleteMany', 'reviews.deleteMany', 'activities.deleteMany', 'interviews.deleteMany', 'applications.deleteOne']);
  assert.deepEqual(Array.from(h.calls[0].query.interviewId.$in), [interviewId]);
  assert.equal('status' in h.calls[0].query, false);
  assert.equal(h.calls.some((c) => c.name.startsWith('companies.')), false);
});
test('deleting only an interview leaves the job and other interviews intact', async () => {
  const h = harness();
  assert.equal((await h.interviews.DELETE({}, context(interviewId))).status, 200);
  assert.deepEqual(h.calls.map((c) => c.name), ['notifications.deleteMany', 'reviews.deleteMany', 'interviews.deleteOne']);
  assert.equal(h.calls[0].query.interviewId, interviewId);
  assert.equal(h.calls[2].query._id, interviewId);
});
test('missing/foreign records cannot trigger cleanup; failed cleanup retains the parent for retry', async () => {
  const missing = harness({ missing: true });
  assert.equal((await missing.jobs.DELETE({}, context())).status, 404);
  assert.equal((await missing.interviews.DELETE({}, context(interviewId))).status, 404);
  assert.equal(missing.calls.length, 0);
  const failed = harness({ failCleanup: true });
  assert.equal((await failed.jobs.DELETE({}, context())).status, 500);
  assert.equal(failed.calls.some((c) => c.name === 'applications.deleteOne'), false);
});
test('removing a JD file preserves its text, notes, status and position', async () => {
  const h = harness();
  const result = await h.jobs.PUT({ json: async () => ({ jdFileUrl: '', jdOriginalFilename: '' }) }, context());
  assert.equal(result.status, 200);
  const update = h.calls.find((c) => c.name === 'applications.update').update.$set;
  assert.equal(update.jdFileUrl, '');
  assert.equal(update.jdOriginalFilename, '');
  for (const key of ['jdText', 'notes', 'position', 'status']) assert.equal(key in update, false);
});
