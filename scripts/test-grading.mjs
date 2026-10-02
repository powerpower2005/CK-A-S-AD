import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gradeScenario, gradeTyped } from '../assets/js/grading.js';

let count=0;
const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
for (const { id: subject } of catalog) {
  const data=JSON.parse(await readFile(new URL(`../data/${subject}.json`,import.meta.url),'utf8'));
  const byId=Object.fromEntries(data.questions.map(q=>[q.id,q]));
  for (const c of data.scenarios) {
    const steps=c.steps.map(id=>byId[id]);
    const answers=Object.fromEntries(steps.map(q=>[q.id,{mode:'mc',choice:q.a}]));
    assert.equal(gradeScenario(steps,answers).correct,true);
    answers[steps[0].id]={mode:'mc',choice:(steps[0].a+1)%4};
    const partial=gradeScenario(steps,answers);
    assert.equal(partial.correct,false);
    assert.equal(partial.earned,steps.length-1);
    assert.equal(partial.details[0].correct,false);
    assert.equal(gradeScenario(steps,{}).earned,0);
    const typed=Object.fromEntries(steps.map(q=>[q.id,{mode:'type',value:q.type.model}]));
    assert.equal(gradeScenario(steps,typed).correct,true);
    for (const q of steps) assert.equal(gradeTyped(q,'   '),false);
    count++;
  }
}
console.log(`Grading verified: ${count} scenarios, full/partial/missing/typed answers.`);

const network = JSON.parse(await readFile(new URL('../data/network.json', import.meta.url), 'utf8'));
const service = network.questions.find(q => q.id === 1);
assert.equal(gradeTyped(service, 'kubectl expose deploy WRONG --port=9999 --target-port=8080'), false);
assert.equal(gradeTyped(service, '--target-port=8080을 사용하면 안 됩니다'), false);
assert.equal(gradeTyped(service, 'kubectl expose deployment app --port 80 --target-port 8080'), true);
for (const { id } of catalog) {
  const { questions } = JSON.parse(await readFile(new URL(`../data/${id}.json`, import.meta.url), 'utf8'));
  for (const q of questions) assert.equal(gradeTyped(q, `틀린 답입니다 ${q.type.model} 사용하지 않습니다`), false);
}
console.log('Typed grading rejects negation and unrelated commands; explicit aliases work.');
