import { loadWrong, saveWrongAnswers } from './storage.js';
import { escapeHtml as esc, loadJSON, initShell, showLoadError } from './site.js';
import { gradeScenario } from './grading.js';

async function init() {
  const subject = await initShell();
  const data = await loadJSON(new URL('../../data/' + subject.id + '.json', import.meta.url));
  const questions = Object.fromEntries(data.questions.map(q => [q.id,q]));
  const cases = data.scenarios.map(c => ({...c,steps:c.steps.map(id=>questions[id])}));
  const byId = Object.fromEntries(cases.map(c=>[c.id,c]));
  const app = document.getElementById('app');
  const S = {scope:'all',part:'',exam:'',order:'seq',mode:'mc',shuffle:true,queue:[],index:0,answers:{},results:{},orders:{}};
  const wrong = loadWrong(subject.id,data.questions.map(q=>q.id));
  const isWrong = c=>c.steps.some(q=>wrong.has(q.id));
  const current = ()=>byId[S.queue[S.index]];
  const hasAnswer = a=>a?.mode==='type'?!!a.value.trim():Number.isInteger(a?.choice);
  const selected = ()=>cases.filter(c=>(S.scope!=='wrong'||isWrong(c))&&(!S.part||c.steps.some(q=>q.part===+S.part))&&(!S.exam||c.steps.some(q=>q.exam.includes(S.exam))));
  function shuffle(items) {
    const a=items.slice();
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  document.title=`쿠버네티스 ${subject.title} · ${cases.length}개 시나리오`;
  function renderHome() {
    const items=selected(), exams=[...new Set(data.questions.flatMap(q=>q.exam))];
    app.innerHTML=`<section class="sheet omr"><div class="pad"><p class="eyebrow">SCENARIO PRACTICE</p><h1>${esc(subject.title)} 실전 과제</h1>
      <p class="lead">${cases.length}개 시나리오 · ${data.questions.length}개 하위 문항<br>한 과제의 여러 판단과 작업을 풀고, 전체 제출 후 단계별 해설을 확인합니다.</p>
      <div class="group"><label class="gtitle" for="scope">출제 범위</label><select id="scope"><option value="all">전체 시나리오</option><option value="wrong">오답이 있는 시나리오</option></select></div>
      <div class="filter-grid"><div class="group"><label class="gtitle" for="part">파트</label><select id="part"><option value="">전체 파트</option>${Object.entries(data.parts).map(([id,label])=>`<option value="${id}">${esc(label)}</option>`).join('')}</select></div>
      <div class="group"><label class="gtitle" for="exam">시험</label><select id="exam"><option value="">전체 시험</option>${exams.map(e=>`<option>${esc(e)}</option>`).join('')}</select></div></div>
      <p class="hint">선택한 파트·시험의 하위 문항이 포함된 시나리오 전체를 출제합니다. 기존 오답 기록도 해당 시나리오에 연결됩니다.</p>
      <div class="filter-grid"><div class="group"><label class="gtitle" for="order">순서</label><select id="order"><option value="seq">기본 순서</option><option value="rand">랜덤</option></select></div>
      <div class="group"><label class="gtitle" for="mode">답변 방식</label><select id="mode"><option value="mc">객관식</option><option value="type">직접 입력 먼저</option></select></div></div>
      <label class="toggle"><input type="checkbox" id="shuffle" ${S.shuffle?'checked':''}> 보기 순서 섞기</label>
      <div class="cta"><button class="btn omrbtn" id="start" ${items.length?'':'disabled'}>시나리오 풀기</button><span class="count">${items.length}개 과제 · ${items.reduce((n,c)=>n+c.steps.length,0)}개 하위 문항</span></div>
      <details class="case-index"><summary>시나리오 목록에서 선택</summary><div class="wlist">${items.map(c=>`<button data-case="${c.id}">${esc(c.title)} <small>· ${c.steps.length}단계${isWrong(c)?' · 오답 있음':''}</small></button>`).join('')}</div></details></div></section>`;
    for(const key of ['scope','part','exam','order','mode']){const el=document.getElementById(key);el.value=S[key];el.onchange=()=>{S[key]=el.value;renderHome();};}
    document.getElementById('shuffle').onchange=e=>{S.shuffle=e.target.checked;};
    document.getElementById('start').onclick=()=>start(items.map(c=>c.id));
    app.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>start([b.dataset.case]));
  }
  function start(ids) {
    S.queue=S.order==='rand'?shuffle(ids):ids.slice();S.index=0;S.answers={};S.results={};S.orders={};
    S.queue.forEach(id=>{S.answers[id]={};byId[id].steps.forEach(q=>{S.orders[q.id]=S.shuffle?shuffle([0,1,2,3]):[0,1,2,3];});});
    renderQuestion();window.scrollTo({top:0});
  }
  function renderQuestion() {
    const c=current(), result=S.results[c.id], answers=S.answers[c.id];
    const count=c.steps.filter(q=>hasAnswer(answers[q.id])).length;
    app.innerHTML=`<nav class="strip" aria-label="시나리오 진행">${S.queue.map((id,i)=>`<button class="dot ${i===S.index?'cur':''} ${S.results[id]?(S.results[id].correct?'ok':'no'):''}" data-jump="${i}" aria-label="${i+1}번째 시나리오">${i+1}</button>`).join('')}</nav>
      <section class="sheet omr"><div class="pad"><div class="meta"><span class="qnum">과제 ${S.index+1} / ${S.queue.length}</span><span class="tag">${c.steps.length}개 하위 문항</span></div>
      <h1>${esc(c.title)}</h1><p class="lead">${esc(c.objective)}</p><p class="scenario-context">${esc(c.context)}</p>
      <div class="scenario-progress" role="status" id="progress">${result?`제출 완료 · ${result.earned}/${result.total}단계 정답`:`${count}/${c.steps.length}단계 응답 · 제출 전에는 정답이 공개되지 않습니다.`}</div>
      ${result?`<div class="verdict ${result.correct?'ok':'no'}">${result.correct?'과제 완료 — 모든 단계 정답':`부분 점수 ${result.earned}/${result.total} — 틀린 단계를 복습하세요.`}</div>`:''}
      ${c.steps.map((q,i)=>stepHTML(q,i,answers[q.id],result?.details[i])).join('')}
      ${result?'':`<div class="submit-panel"><p class="hint">모든 단계에 답하면 제출할 수 있습니다. 제출 전에는 선택을 바꿀 수 있습니다.</p><button class="btn omrbtn" id="submitCase" ${count===c.steps.length?'':'disabled'}>과제 전체 제출</button></div>`}
      <div class="nav"><button class="btn ghost" id="prev" ${S.index===0?'disabled':''}>이전 과제</button><button class="btn ghost" id="results">결과 보기</button><button class="btn" id="next">${S.index===S.queue.length-1?'결과 보기':result?'다음 과제':'다음 과제로 이동'}</button></div></div></section>`;
    app.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>go(+b.dataset.jump));
    app.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{
      const id=+b.dataset.step, choice=+b.dataset.choice;answers[id]={mode:'mc',choice};
      const y=window.scrollY;renderQuestion();window.scrollTo({top:y});
      app.querySelector(`[data-step="${id}"][data-choice="${choice}"]`)?.focus({preventScroll:true});
    });
    app.querySelectorAll('[data-input]').forEach(input=>input.oninput=()=>{answers[+input.dataset.input]={mode:'type',value:input.value};updateProgress();});
    app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
      const id=+b.dataset.mode, prev=answers[id]?.mode??S.mode;
      answers[id]=prev==='type'?{mode:'mc'}:{mode:'type',value:''};
      const y=window.scrollY;renderQuestion();window.scrollTo({top:y});
    });
    app.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(questions[+b.dataset.copy].code);b.textContent='복사됨';}catch{b.textContent='복사 실패';}});
    const submit=document.getElementById('submitCase');
    if(submit)submit.onclick=()=>{
      if(!c.steps.every(q=>hasAnswer(answers[q.id])))return;
      const graded=gradeScenario(c.steps,answers);S.results[c.id]=graded;
      graded.details.forEach(r=>r.correct?wrong.delete(r.id):wrong.add(r.id));saveWrongAnswers(subject.id,[...wrong]);
      renderQuestion();document.getElementById('progress').scrollIntoView({block:'center'});
    };
    document.getElementById('prev').onclick=()=>go(S.index-1);
    document.getElementById('next').onclick=()=>S.index===S.queue.length-1?renderResult():go(S.index+1);
    document.getElementById('results').onclick=renderResult;
  }
  function updateProgress(){const c=current(),n=c.steps.filter(q=>hasAnswer(S.answers[c.id][q.id])).length;document.getElementById('progress').textContent=`${n}/${c.steps.length}단계 응답 · 제출 전에는 정답이 공개되지 않습니다.`;document.getElementById('submitCase').disabled=n!==c.steps.length;}
  function stepHTML(q,index,answer,result){
    const mode=answer?.mode??S.mode,order=S.orders[q.id];
    return `<section class="scenario-step" aria-labelledby="step-${q.id}"><h2 id="step-${q.id}"><span class="step-number">${index+1}</span> 하위 문항 ${index+1}${result?` <span class="step-verdict ${result.correct?'ok':'no'}">${result.correct?'정답':'오답'}</span>`:''}</h2><div class="qtext">${q.q}</div>
      ${mode==='type'?`<div class="typebox"><label for="input-${q.id}">${q.type.p}</label><div class="typerow"><input id="input-${q.id}" data-input="${q.id}" value="${esc(answer?.value??'')}" autocomplete="off" spellcheck="false" ${result?'disabled':''} placeholder="핵심 설정이나 명령을 입력하세요"></div></div>`:`<div class="opts">${order.map((oi,pos)=>`<button class="opt ${answer?.choice===oi?'selected':''} ${result?(oi===q.a?'right':answer?.choice===oi?'wrong':''):''}" data-step="${q.id}" data-choice="${oi}" aria-pressed="${answer?.choice===oi}" ${result?'disabled':''}><span class="o">${'ABCD'[pos]}</span><span>${q.opts[oi]}</span></button>`).join('')}</div>`}
      ${result?`<div class="exp"><p class="qtitle">${esc(q.title)} · 원문 번호 ${q.id}</p><p><b>정답:</b> ${q.opts[q.a]}</p><p><b>모범 입력:</b> <code>${esc(q.type.model)}</code></p><h3>해설</h3>${q.exp}<details><summary>다른 보기와 실습 예제</summary><ul>${q.whyno.map(w=>`<li>${w}</li>`).join('')}</ul><div class="codewrap"><pre><code>${esc(q.code)}</code></pre><button class="copy" data-copy="${q.id}">복사</button></div><div class="trap">${q.trap}</div><div class="docs">${q.docs.map(([t,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div></details></div>`:`<button class="mini mode-switch" data-mode="${q.id}">${mode==='type'?'보기에서 선택하기':'직접 입력으로 바꾸기'}</button>`}</section>`;
  }
  function go(index){if(index<0||index>=S.queue.length)return;S.index=index;renderQuestion();window.scrollTo({top:0});}
  function renderResult(){
    const submitted=S.queue.filter(id=>S.results[id]),incorrect=submitted.filter(id=>!S.results[id].correct),pending=S.queue.filter(id=>!S.results[id]);
    const earned=submitted.reduce((n,id)=>n+S.results[id].earned,0),total=submitted.reduce((n,id)=>n+S.results[id].total,0);
    const list=ids=>`<div class="wlist">${ids.map(id=>`<button data-review="${id}">${esc(byId[id].title)} · ${S.results[id]?`${S.results[id].earned}/${S.results[id].total}단계`:'미제출'}</button>`).join('')}</div>`;
    app.innerHTML=`<section class="sheet omr"><div class="pad"><h1>시나리오 결과</h1><div class="big">${earned}<small> / ${total}단계 · ${total?Math.round(earned/total*100):0}%</small></div><p class="lead">모든 단계 정답: ${submitted.length-incorrect.length}/${submitted.length}개 제출 과제<br>미제출 ${pending.length}개 과제는 점수에서 제외됩니다.</p><h2>복습할 과제</h2>${incorrect.length?list(incorrect):'<p>제출한 과제에 오답이 없습니다.</p>'}${pending.length?`<h2>이어서 풀 과제</h2>${list(pending)}`:''}${submitted.length?`<details><summary>제출한 모든 과제 다시 보기</summary>${list(submitted)}</details>`:''}<div class="cta">${incorrect.length?'<button class="btn omrbtn" id="retryWrong">오답 과제 다시 풀기</button>':''}<button class="btn" id="retry">같은 범위 다시 풀기</button><button class="btn ghost" id="settings">설정으로</button></div><p class="hint">오답은 하위 문항별로 저장됩니다. 다시 풀 때는 해당 시나리오 전체를 연습합니다.</p></div></section>`;
    app.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>go(S.queue.indexOf(b.dataset.review)));
    const rw=document.getElementById('retryWrong');if(rw)rw.onclick=()=>start(incorrect);
    document.getElementById('retry').onclick=()=>start(S.queue);document.getElementById('settings').onclick=renderHome;window.scrollTo({top:0});
  }
  document.getElementById('homeBtn').onclick=renderHome;renderHome();
}
init().catch(showLoadError);
