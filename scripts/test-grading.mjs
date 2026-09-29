import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gradeScenario, gradeTyped } from '../assets/js/grading.js';

let count=0;
for (const subject of ['storage','network','cluster','troubleshooting']) {
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
