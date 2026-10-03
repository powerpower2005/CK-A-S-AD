import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectCases, summarize, remainingSeconds, dataSignature, validSession } from '../assets/js/study.js';
const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
for (const { id } of catalog) {
  const data = JSON.parse(await readFile(new URL(`../data/${id}.json`, import.meta.url), 'utf8'));
  const questions = Object.fromEntries(data.questions.map(q => [q.id, q]));
  const cases = data.scenarios.map(c => ({ ...c, steps: c.steps.map(id => questions[id]) }));
  for (const exam of ['CKA', 'CKAD', 'CKS']) {
    const chosen = selectCases(cases, { scope: 'all', exam }, new Set());
    assert(chosen.every(c => c.steps.every(q => q.exam.includes(exam))));
    assert.equal(chosen.reduce((n, c) => n + c.steps.length, 0), data.questions.filter(q => q.exam.includes(exam)).length);
  }
  const first = cases[0], byId = { [first.id]: first }, signature = dataSignature(data);
  assert.equal(signature, dataSignature({ ...data, questions: data.questions.map(({ tags, ...q }) => q) }), 'Adding tags must preserve saved progress');
  const session = { signature, queue: [first.id], index: 0, practice: 'study', view: 'question', mode: 'type', answers: { [first.id]: {} }, results: {}, orders: Object.fromEntries(first.steps.map(q => [q.id, [0, 1, 2, 3]])), hints: {} };
  assert(validSession(session, signature, byId));
  assert(validSession({ ...session, answers: { [first.id]: { [first.steps[0].id]: { mode: 'mc' } } } }, signature, byId));
  assert(!validSession({ ...session, signature: 'old-data' }, signature, byId));
  assert(!validSession({ ...session, queue: ['case-missing'] }, signature, byId));
  assert(!validSession({ ...session, index: 99 }, signature, byId));
  assert(!validSession({ ...session, answers: null }, signature, byId));
  assert(!validSession({ ...session, orders: {} }, signature, byId));
  const exam = { ...session, practice: 'exam', deadline: 1000, finished: false };
  assert(validSession(exam, signature, byId));
  assert(!validSession({ ...exam, deadline: null }, signature, byId));
  const results = { [first.id]: { earned: 1, details: [{ id: first.steps[0].id, correct: true }] } };
  const summary = summarize([first.id], byId, results);
  assert.equal(summary.total, first.steps.length);
  assert.equal(summary.submitted, 1);
  assert.equal(summary.unanswered, first.steps.length - 1);
  assert(summary.percent < 100);
  assert.equal(summarize([first.id], byId, {}).earned, 0);
  const wrong = new Set([first.steps[0].id]);
  assert(selectCases(cases, { scope: 'wrong' }, wrong).every(c => c.steps.some(q => wrong.has(q.id))));
}
assert.equal(remainingSeconds(3000, 1000), 2);
assert.equal(remainingSeconds(3000, 3000), 0);
assert.equal(remainingSeconds(3000, 5000), 0);
console.log('Study verified: strict exam filters, whole-range scores, valid/invalid saved sessions and absolute deadlines.');
