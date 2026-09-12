import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (id) => id in mocks ? mocks[id] : require(id) });
  return exports;
}
const schemas = load('src/lib/validations.ts');
const payload = { interviewId: 'bbbbbbbbbbbbbbbbbbbbbbbb', applicationId: 'cccccccccccccccccccccccc', companyId: 'dddddddddddddddddddddddd', companyOffer: 19500000, advantages: ['Mentor'], disadvantages: ['Commute'], generalNotes: 'Ask about hours' };
test('review validation rejects negative, infinite, invalid percentages and IDs', () => {
  for (const patch of [{ companyOffer: -1 }, { salaryDiscussed: Infinity }, { probationSalary: 101 }, { probationSalary: -1 }, { interviewId: 'invalid' }, { currency: 'INVALID' }]) {
    assert.equal(schemas.createReviewSchema.safeParse({ ...payload, ...patch }).success, false);
  }
  assert.equal(schemas.createReviewSchema.safeParse({ ...payload, probationSalary: 85, expectedSalary: 0 }).success, true);
});
test('editing only an offer preserves omitted review fields', () => {
  const parsed = schemas.updateReviewSchema.parse({ companyOffer: 20500000 });
  assert.deepEqual(Object.keys(parsed), ['companyOffer']);
  assert.equal(parsed.companyOffer, 20500000);
});
function harness({ status = 'SCHEDULED', mismatch = false, duplicate = false, missingJob = false } = {}) {
  const events = [];
  const interview = { _id: payload.interviewId, applicationId: mismatch ? 'aaaaaaaaaaaaaaaaaaaaaaaa' : payload.applicationId, companyId: payload.companyId, status, save: async () => events.push('interview saved') };
  let saved;
  const route = load('src/app/api/reviews/route.ts', {
    '@/lib/mongodb': async () => {},
    '@/lib/auth': { requireAuth: async () => ({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }) },
    '@/lib/validations': schemas,
    '@/lib/api-utils': { successResponse: (data, status = 200) => ({ status, data }), errorResponse: (error, status = 400) => ({ status, error }), handleApiError: (error) => ({ status: error.name === 'ZodError' ? 400 : 500 }) },
    '@/models/Interview': { findOne: async () => interview },
    '@/models/InterviewReview': { findOne: async () => duplicate ? {} : null, create: async (data) => { saved = data; events.push('review saved'); return data; } },
    '@/models/Application': { findOne: async () => missingJob ? null : {}, updateOne: async () => events.push('application updated') },
    '@/models/Company': { findOne: async () => ({}) },
    '@/services/notification.service': { deleteInterviewReminders: async (id) => { assert.equal(id, payload.interviewId); events.push('reminders deleted'); }, createActivity: async () => events.push('activity created') },
  });
  return { post: (body = payload) => route.POST({ json: async () => body }), events, interview, saved: () => saved };
}
test('saving a review completes the interview and removes pending reminders', async () => {
  const h = harness();
  assert.equal((await h.post()).status, 201);
  assert.equal(h.interview.status, 'COMPLETED');
  assert.equal(h.saved().companyOffer, 19500000);
  assert.equal(h.saved().generalNotes, payload.generalNotes);
  assert.ok(h.events.includes('reminders deleted'));
  assert.ok(h.events.includes('application updated'));
});
test('mismatched jobs, cancelled interviews, duplicate reviews and missing jobs cannot write', async () => {
  for (const [options, code] of [[{ mismatch: true }, 400], [{ status: 'CANCELLED' }, 400], [{ status: 'NO_SHOW' }, 400], [{ duplicate: true }, 409], [{ missingJob: true }, 404]]) {
    const h = harness(options);
    assert.equal((await h.post()).status, code);
    assert.equal(h.events.length, 0);
  }
});
