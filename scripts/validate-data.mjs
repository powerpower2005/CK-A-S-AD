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
      assert(Array.isArray(q.tags) && q.tags.length && q.tags.every(t => text(t) && t === t.trim()) && new Set(q.tags).size === q.tags.length, `${label}: invalid/duplicate tags`);
      assert(q.exam.every(e => q.tags.includes(e)) && q.tags.filter(t => ['CKA', 'CKS', 'CKAD', '기타'].includes(t)).every(e => q.exam.includes(e)), `${label}: exam tags must match all assigned exams`);
      assert(q.tags.some(t => !['CKA', 'CKS', 'CKAD', '기타'].includes(t)), `${label}: missing topic tag`);
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
  const labData = await readJSON('labs.json');
  assert(labData.schemaVersion === 1 && Array.isArray(labData.labs), 'Invalid lab data');
  const labIds = new Set();
  for (const lab of labData.labs) {
    const label = `lab ${lab.id}`;
    assert(/^[a-z][a-z0-9-]*$/.test(lab.id) && !labIds.has(lab.id), `${label}: duplicate/invalid ID`);
    labIds.add(lab.id);
    assert(subjectIds.has(lab.subject), `${label}: unknown subject`);
    assert(lab.namespace === `lab-${lab.id}`, `${label}: unexpected namespace`);
    for (const field of ['title', 'objective', 'setup', 'solution', 'cleanup', 'environment', 'reviewedAt']) assert(text(lab[field]), `${label}: missing ${field}`);
    for (const field of ['requirements', 'tasks']) assert(Array.isArray(lab[field]) && lab[field].length && lab[field].every(text), `${label}: invalid ${field}`);
    assert(lab.exam.length && lab.exam.every(e => ['CKA', 'CKAD', 'CKS'].includes(e)), `${label}: invalid exams`);
    assert(lab.execution === 'not-run', `${label}: execution status must describe the actual verification`);
    assert(lab.checks.length && lab.checks.every(c => text(c.command) && text(c.expected)), `${label}: invalid checks`);
    assert(!JSON.stringify(lab).includes('$NS'), `${label}: unresolved namespace placeholder`);
    assert(lab.cleanup.includes(`kubectl delete namespace ${lab.namespace}`), `${label}: missing cleanup`);
    const files = new Set();
    for (const file of lab.files) {
      assert(/^[a-z0-9.-]+\.yaml$/.test(file.name) && !files.has(file.name) && text(file.content), `${label}: invalid starter file`);
      files.add(file.name);
    }
    assert(lab.docs.length && lab.docs.every(d => d.length === 2 && d.every(text) && new URL(d[1]).protocol === 'https:'), `${label}: invalid docs`);
  }
  await access(path.join(root, 'labs', 'index.html'));
  console.log(`Validated ${summaries.length} subjects, ${summaries.reduce((sum, item) => sum + item.count, 0)} scenarios, ${summaries.reduce((sum, item) => sum + item.stepCount, 0)} steps and ${labIds.size} lab guides.`);
  return summaries;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await validateData();
}
