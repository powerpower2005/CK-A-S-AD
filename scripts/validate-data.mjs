import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gradeTyped } from '../assets/js/grading.js';

export const root = fileURLToPath(new URL('../', import.meta.url));
const readJSON = async name => JSON.parse(await readFile(path.join(root, 'data', name), 'utf8'));

export async function validateData() {
  const catalog = await readJSON('catalog.json');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const text = value => typeof value === 'string' && value.trim().length > 0;
  assert(Array.isArray(catalog) && catalog.length > 0, 'catalog must contain subjects');
  const subjectIds = new Set();
  const summaries = [];
  for (const subject of catalog) {
    assert(/^[a-z][a-z0-9-]*$/.test(subject.id), 'Invalid subject ID');
    assert(!subjectIds.has(subject.id), `Duplicate subject: ${subject.id}`);
    subjectIds.add(subject.id);
    assert(subject.path === `${subject.id}/`, `${subject.id}: path must match ID`);
    for (const field of ['title', 'summary', 'description']) assert(text(subject[field]), `${subject.id}: missing ${field}`);
    await access(path.join(root, subject.path, 'index.html'));
    const data = await readJSON(`${subject.id}.json`);
    assert(data.schemaVersion === 2, `${subject.id}: unsupported schemaVersion`);
    assert(data.parts && typeof data.parts === 'object' && !Array.isArray(data.parts), `${subject.id}: invalid parts`);
    assert(Object.entries(data.parts).every(([id, label]) => /^\d+$/.test(id) && text(label)), `${subject.id}: invalid part names`);
    assert(Array.isArray(data.questions) && data.questions.length > 0, `${subject.id}: no questions`);
    const ids = new Set();
    for (const q of data.questions) {
      const label = `${subject.id} question ${q.id}`;
      assert(Number.isInteger(q.id) && q.id > 0 && !ids.has(q.id), `${label}: duplicate/invalid ID`);
      ids.add(q.id);
      assert(Number.isInteger(q.part) && Object.hasOwn(data.parts, q.part), `${label}: unknown part`);
      assert(Array.isArray(q.exam) && q.exam.length && q.exam.every(e => ['CKA', 'CKS', 'CKAD', '기타'].includes(e)), `${label}: invalid exam`);
      for (const field of ['title', 'q', 'exp', 'code', 'trap', 'freqNote']) assert(text(q[field]), `${label}: missing ${field}`);
      assert(Array.isArray(q.opts) && q.opts.length === 4 && q.opts.every(text), `${label}: expected four options`);
      assert(Number.isInteger(q.a) && q.a >= 0 && q.a < q.opts.length, `${label}: answer out of range`);
      assert(q.type && text(q.type.p) && text(q.type.model), `${label}: missing typed answer`);
      assert(Array.isArray(q.type.acc) && q.type.acc.length && q.type.acc.every(text), `${label}: missing accepted answers`);
      assert(gradeTyped(q, q.type.model), `${label}: model answer rejected`);
      assert(Array.isArray(q.whyno) && q.whyno.length === 3 && q.whyno.every(text), `${label}: expected three wrong-answer explanations`);
      assert(Number.isInteger(q.freq) && q.freq >= 0 && q.freq <= 5, `${label}: invalid frequency`);
      assert(Array.isArray(q.docs) && q.docs.length > 0, `${label}: missing documentation`);
      for (const doc of q.docs) {
        assert(Array.isArray(doc) && doc.length === 2 && doc.every(text), `${label}: invalid documentation entry`);
        assert(new URL(doc[1]).protocol === 'https:', `${label}: documentation must use HTTPS`);
      }
    }
    assert(Array.isArray(data.scenarios) && data.scenarios.length > 0, `${subject.id}: no scenarios`);
    const scenarioIds = new Set(), covered = new Set();
    for (const scenario of data.scenarios) {
      const label = `${subject.id} scenario ${scenario.id}`;
      assert(/^case-\d+$/.test(scenario.id) && !scenarioIds.has(scenario.id), `${label}: invalid/duplicate ID`);
      scenarioIds.add(scenario.id);
      for (const field of ['title', 'objective', 'context']) assert(text(scenario[field]), `${label}: missing ${field}`);
      assert(Array.isArray(scenario.steps) && scenario.steps.length >= 2, `${label}: at least two steps required`);
      for (const id of scenario.steps) {
        assert(ids.has(id) && !covered.has(id), `${label}: unknown or repeated step ${id}`);
        covered.add(id);
      }
    }
    assert(covered.size === ids.size, `${subject.id}: orphan questions`);
    summaries.push({ ...subject, count: data.scenarios.length, stepCount: data.questions.length, partCount: Object.keys(data.parts).length });
  }
  console.log(`Validated ${summaries.length} subjects, ${summaries.reduce((sum, item) => sum + item.count, 0)} scenarios, ${summaries.reduce((sum, item) => sum + item.stepCount, 0)} steps.`);
  return summaries;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await validateData();
}
