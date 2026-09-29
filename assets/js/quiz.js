import { loadWrong, saveWrongAnswers } from './storage.js';
import { escapeHtml as esc, loadJSON, initShell, showLoadError } from './site.js';

async function init() {
  const subject = await initShell();
  const data = await loadJSON(new URL('../../data/' + subject.id + '.json', import.meta.url));
  const Q = data.questions;
  const PARTS = data.parts;
  const EXAMS = ['CKA', 'CKS', 'CKAD', '기타'].filter(exam => Q.some(q => q.exam.includes(exam)));
  const FREQ_LABEL = ['범위 밖','드묾','낮음','보통','높음','매우 높음'];
  document.title = '쿠버네티스 ' + subject.title + ' ' + Q.length + '제 · CKA / CKS / CKAD';
const BY_ID = Object.fromEntries(Q.map(q=>[q.id,q]));

/* =========================================================
   상태
   ========================================================= */
const S = {
  order:"seq", scope:"all", parts:new Set(Object.keys(PARTS).map(Number)), exams:new Set(EXAMS), minFreq:0,
  picked:new Set(Q.map(q=>q.id)), answerMode:"mc", shuffleOpts:true, showTitle:false,
  queue:[], idx:0, results:{}, optOrder:{}, typed:{}
};
let wrongNote = loadWrong(subject.id, Q.map(q => q.id));
const saveWrong = ()=>saveWrongAnswers(subject.id, [...wrongNote]);

const app = document.getElementById("app");
const norm = s => s.toLowerCase().replace(/[\s`]/g,"").replace(/[']/g,'"').replace(/[,;]+$/,"");
const shuffle = a => {a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const LETTERS = ["A","B","C","D"];
const freqDots = n => "●".repeat(n)+"○".repeat(5-n);

/* =========================================================
   홈
   ========================================================= */
function scopeIds(){ return scopeIdsRaw().filter(id=>BY_ID[id].freq>=S.minFreq); }
function scopeIdsRaw(){
  if(S.scope==="all") return Q.map(q=>q.id);
  if(S.scope==="part") return Q.filter(q=>S.parts.has(q.part)).map(q=>q.id);
  if(S.scope==="exam") return Q.filter(q=>q.exam.some(e=>S.exams.has(e))).map(q=>q.id);
  if(S.scope==="pick") return Q.filter(q=>S.picked.has(q.id)).map(q=>q.id);
  if(S.scope==="wrong") return Q.filter(q=>wrongNote.has(q.id)).map(q=>q.id);
  return [];
}
function seg(name,items,cur){
  return `<div class="seg" role="group" data-seg="${name}">${items.map(([v,l])=>
    `<button type="button" data-v="${v}" aria-pressed="${cur===v}">${l}</button>`).join("")}</div>`;
}
function renderHome(){
  const ids = scopeIds();
  let scopeBody = "";
  if(S.scope==="part"){
    scopeBody = `<div class="seg" style="margin-top:10px">${Object.entries(PARTS).map(([k,v])=>
      `<button type="button" data-part="${k}" aria-pressed="${S.parts.has(+k)}">${v}</button>`).join("")}</div>`;
  } else if(S.scope==="exam"){
    scopeBody = `<div class="seg" style="margin-top:10px">${EXAMS.map(e=>
      `<button type="button" data-exam="${e}" aria-pressed="${S.exams.has(e)}">${e}</button>`).join("")}</div>
      <div class="hint">여러 시험에 해당하는 문제는 각 시험 범위에 함께 포함됩니다.</div>`;
  } else if(S.scope==="pick"){
    scopeBody = `<div class="row" style="margin-top:10px">
        <button type="button" class="mini" data-pickall="1">전체 선택</button>
        <button type="button" class="mini" data-pickall="0">전체 해제</button>
        <span class="hint" style="margin:0">번호를 눌러 문제를 고르세요. 빨간 테두리는 오답노트에 있는 문제입니다.</span>
      </div>
      <div class="bubbles">${Q.map(q=>
        `<button type="button" class="bub ${wrongNote.has(q.id)?"wrongmark":""}" data-pick="${q.id}" aria-pressed="${S.picked.has(q.id)}" title="${q.id}. ${esc(q.title)}">${String(q.id).padStart(2,"0")}</button>`).join("")}</div>`;
  } else if(S.scope==="wrong"){
    scopeBody = `<div class="hint">${wrongNote.size?`오답노트에 ${wrongNote.size}문제가 있습니다. 맞히면 자동으로 빠집니다.`:"오답노트가 비어 있습니다. 문제를 풀고 틀리면 여기에 쌓입니다."}</div>
      ${wrongNote.size?`<div class="row" style="margin-top:8px"><button type="button" class="mini" id="clearWrong">오답노트 비우기</button></div>`:""}`;
  }
  app.innerHTML = `
  <section class="sheet omr"><div class="pad">
    <h1>쿠버네티스 ${esc(subject.title)} ${Q.length}제</h1>
    <p class="lead">${esc(subject.description)}</p>

    <div class="group"><div class="gtitle">출제 범위</div>
      ${seg("scope",[["all",`전체 ${Q.length}문제`],["part","파트별"],["exam","시험별"],["pick","번호 직접 선택"],["wrong","오답노트"]],S.scope)}
      ${scopeBody}
    </div>

    <div class="group"><div class="gtitle">출제율 필터</div>
      <div class="seg" role="group">${[[0,"전체"],[3,"보통 이상"],[4,"높음 이상"],[5,"매우 높음만"]].map(([v,l])=>
        `<button type="button" data-minfreq="${v}" aria-pressed="${S.minFreq===v}">${l}</button>`).join("")}</div>
      <div class="hint">출제율은 CNCF 공식 커리큘럼의 도메인 비중과 공개 응시 후기·모의고사 빈도를 바탕으로 한 추정치입니다. 문제별 공식 통계는 공개되지 않습니다.</div>
    </div>

    <div class="group"><div class="gtitle">순서</div>
      ${seg("order",[["seq","번호순"],["rand","랜덤"],["freq","출제율 높은 순"]],S.order)}
    </div>

    <div class="group"><div class="gtitle">답하는 방식</div>
      ${seg("answerMode",[["mc","객관식 (입력 칸은 선택)"],["type","직접 입력 먼저"]],S.answerMode)}
      <div class="hint">${S.answerMode==="mc"?"보기를 고르면 채점됩니다. 보기 아래 입력 칸에 핵심 설정을 먼저 쳐 보는 것도 가능합니다.":"입력으로 먼저 채점하고, 막히면 보기를 펼쳐서 고를 수 있습니다."}</div>
      <label class="toggle"><input type="checkbox" id="shuf" ${S.shuffleOpts?"checked":""}> 보기 순서 섞기</label>
      <label class="toggle"><input type="checkbox" id="stitle" ${S.showTitle?"checked":""}> 유형명 미리 보기 (힌트가 될 수 있음)</label>
    </div>

    <div class="cta">
      <button type="button" class="btn omrbtn" id="startBtn" ${ids.length?"":"disabled"}>풀기 시작</button>
      <span class="count">${ids.length}문제</span>
    </div>
  </div></section>`;

  app.querySelectorAll("[data-seg]").forEach(g=>g.addEventListener("click",e=>{
    const b=e.target.closest("button[data-v]"); if(!b) return;
    S[g.dataset.seg]=b.dataset.v; renderHome();
  }));
  app.querySelectorAll("[data-minfreq]").forEach(b=>b.onclick=()=>{S.minFreq=+b.dataset.minfreq;renderHome()});
  app.querySelectorAll("[data-part]").forEach(b=>b.onclick=()=>{const k=+b.dataset.part;S.parts.has(k)?S.parts.delete(k):S.parts.add(k);renderHome()});
  app.querySelectorAll("[data-exam]").forEach(b=>b.onclick=()=>{const k=b.dataset.exam;S.exams.has(k)?S.exams.delete(k):S.exams.add(k);renderHome()});
  app.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{const k=+b.dataset.pick;S.picked.has(k)?S.picked.delete(k):S.picked.add(k);renderHome()});
  app.querySelectorAll("[data-pickall]").forEach(b=>b.onclick=()=>{S.picked=b.dataset.pickall==="1"?new Set(Q.map(q=>q.id)):new Set();renderHome()});
  const cw=document.getElementById("clearWrong"); if(cw) cw.onclick=()=>{wrongNote.clear();saveWrong();renderHome()};
  document.getElementById("shuf").onchange=e=>S.shuffleOpts=e.target.checked;
  document.getElementById("stitle").onchange=e=>S.showTitle=e.target.checked;
  document.getElementById("startBtn").onclick=()=>start(ids);
}

function start(ids){
  S.queue = S.order==="rand"?shuffle(ids):S.order==="freq"?ids.slice().sort((a,b)=>BY_ID[b].freq-BY_ID[a].freq||a-b):ids.slice();
  revealOpts=false; S.idx=0; S.results={}; S.typed={}; S.optOrder={};
  S.queue.forEach(id=>{S.optOrder[id]=S.shuffleOpts?shuffle([0,1,2,3]):[0,1,2,3]});
  renderQuestion(); window.scrollTo({top:0});
}

/* =========================================================
   문제 화면
   ========================================================= */
let revealOpts = false;
function renderQuestion(){
  const id=S.queue[S.idx], q=BY_ID[id], res=S.results[id], answered=!!res;
  const order=S.optOrder[id];
  const correctCount=Object.values(S.results).filter(r=>r.correct).length;
  const doneCount=Object.keys(S.results).length;
  const typed=S.typed[id];
  const showOpts = S.answerMode==="mc" || answered || revealOpts || (typed && !typed.ok);

  const strip = S.queue.map((qid,i)=>{
    const r=S.results[qid];
    return `<button type="button" class="dot ${i===S.idx?"cur":""} ${r?(r.correct?"ok":"no"):""}" data-jump="${i}" aria-label="${i+1}번째 문제 (유형 ${qid})">${String(qid).padStart(2,"0")}</button>`;
  }).join("");

  const optsHtml = order.map((oi,pos)=>{
    let cls="opt";
    if(answered){
      if(oi===q.a) cls+=" right";
      else if(res.choice===oi) cls+=" wrong";
    }
    return `<button type="button" class="${cls}" data-opt="${oi}" ${answered?"disabled":""}><span class="o">${LETTERS[pos]}</span><span>${q.opts[oi]}</span></button>`;
  }).join("");

  const typeHtml = `
    <div class="typebox">
      <label for="typeIn">${S.answerMode==="type"?"직접 입력":"직접 입력으로 먼저 도전 (선택)"}</label>
      <p class="p">${q.type.p}</p>
      <div class="typerow">
        <input id="typeIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="여기에 입력" value="${typed?esc(typed.v):""}" ${answered||(typed&&typed.ok)?"disabled":""}>
        <button type="button" class="btn ghost" id="typeBtn" ${answered||(typed&&typed.ok)?"disabled":""}>확인</button>
      </div>
      ${typed?`<div class="typeres ${typed.ok?"ok":"no"}">${typed.ok?"입력 정답입니다.":"입력이 기대 답과 다릅니다."} ${(!typed.ok&&!answered)?"보기에서 골라 보세요.":""}</div>`:""}
      ${answered?`<div class="typeres" style="color:var(--muted)">모범 입력: <code>${esc(q.type.model)}</code></div>`:""}
    </div>`;

  let expHtml="";
  if(answered){
    const rightPos = LETTERS[order.indexOf(q.a)];
    expHtml = `
    <div class="verdict ${res.correct?"ok":"no"}">${res.correct?"정답입니다.":`오답입니다. 정답은 ${rightPos}번입니다.`}</div>
    <div class="exp">
      ${S.showTitle?"":`<p class="qtitle">유형 ${String(q.id).padStart(2,"0")} · ${q.title}</p>`}
      <div class="freqbox"><b>예상 출제율 ${freqDots(q.freq)} ${FREQ_LABEL[q.freq]}</b> · ${q.freqNote}</div>
      <h3>해설</h3>${q.exp}
      <h3>다른 보기가 틀린 이유</h3>
      <ul class="whyno">${q.whyno.map(w=>`<li>${w}</li>`).join("")}</ul>
      <h3>예시 매니페스트와 명령</h3>
      <div class="codewrap"><pre><code>${esc(q.code)}</code></pre><button type="button" class="copy" id="copyBtn">복사</button></div>
      <div class="trap"><b>시험장 팁</b> · ${q.trap}</div>
      <h3>공식 문서</h3>
      <div class="docs">${q.docs.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${t}<small>${u.replace("https://","")}</small></a>`).join("")}</div>
    </div>`;
  }

  const isLast = S.idx===S.queue.length-1;
  app.innerHTML = `
  <nav class="strip" aria-label="문제 진행">${strip}</nav>
  <section class="sheet omr"><div class="pad">
    <div class="meta">
      <span class="qnum">${S.idx+1}/${S.queue.length}</span>
      ${q.exam.map(e=>`<span class="tag ex">${e}</span>`).join("")}
      <span class="tag">${PARTS[q.part].split(" · ")[0]}</span>
      <span class="freq f${q.freq}" title="예상 출제율">${freqDots(q.freq)} ${FREQ_LABEL[q.freq]}</span>
      <span class="score">맞힘 ${correctCount} / 푼 문제 ${doneCount}</span>
    </div>
    ${S.showTitle?`<p class="qtitle">유형 ${String(q.id).padStart(2,"0")} · ${q.title}</p>`:""}
    <p class="qtext">${q.q}</p>
    ${S.answerMode==="type"?typeHtml:""}
    ${showOpts?`<div class="opts" style="${S.answerMode==="type"?"margin-top:16px":""}">${optsHtml}</div>`
      :`<div class="row" style="margin-top:14px"><button type="button" class="btn ghost" id="revealBtn">보기 펼치기</button></div>`}
    ${S.answerMode==="mc"?typeHtml:""}
    ${expHtml}
    <div class="nav">
      <button type="button" class="btn ghost" id="prevBtn" ${S.idx===0?"disabled":""}>이전</button>
      <button type="button" class="btn ghost" id="quitBtn">결과 보기</button>
      <button type="button" class="btn ${answered?"omrbtn":""}" id="nextBtn">${isLast?"끝내기":(answered?"다음 문제":"건너뛰기")}</button>
    </div>
    <div class="kbd"><kbd>A</kbd>–<kbd>D</kbd> 또는 <kbd>1</kbd>–<kbd>4</kbd> 선택 · <kbd>←</kbd><kbd>→</kbd> 이동</div>
  </div></section>`;

  app.querySelectorAll("[data-opt]").forEach(b=>b.onclick=()=>choose(+b.dataset.opt));
  app.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>go(+b.dataset.jump));
  const cur=app.querySelector(".dot.cur"); if(cur) cur.scrollIntoView({block:"nearest",inline:"center"});
  const tb=document.getElementById("typeBtn"), ti=document.getElementById("typeIn");
  if(tb){tb.onclick=checkTyped; ti.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();checkTyped()}}}
  const rb=document.getElementById("revealBtn"); if(rb) rb.onclick=()=>{revealOpts=true;renderQuestion()};
  const cb=document.getElementById("copyBtn"); if(cb) cb.onclick=()=>{
    if (!navigator.clipboard) { cb.textContent="복사할 수 없음"; return; }
    navigator.clipboard.writeText(q.code).then(()=>{cb.textContent="복사됨"},()=>{cb.textContent="복사 실패"});
  };
  document.getElementById("prevBtn").onclick=()=>go(S.idx-1);
  document.getElementById("nextBtn").onclick=()=>isLast?renderResult():go(S.idx+1);
  document.getElementById("quitBtn").onclick=renderResult;
  if(S.answerMode==="type" && !answered && ti && !ti.disabled && !(typed)) ti.focus({preventScroll:true});
}

function checkTyped(){
  const id=S.queue[S.idx], q=BY_ID[id], v=document.getElementById("typeIn").value;
  if(!v.trim()) return;
  const n=norm(v);
  const ok=q.type.acc.some(a=>{const k=norm(a);return n===k || (k.length>=6 && n.includes(k))});
  S.typed[id]={v,ok};
  if(S.answerMode==="type" && ok) record(id,q.a,true);
  renderQuestion();
}
function choose(oi){
  const id=S.queue[S.idx], q=BY_ID[id];
  if(S.results[id]) return;
  record(id,oi,oi===q.a);
  renderQuestion();
}
function record(id,choice,correct){
  S.results[id]={choice,correct};
  if(correct) wrongNote.delete(id); else wrongNote.add(id);
  saveWrong();
}
function go(i){
  if(i<0||i>=S.queue.length) return;
  S.idx=i; revealOpts=false; renderQuestion(); window.scrollTo({top:0});
}

/* =========================================================
   결과
   ========================================================= */
function renderResult(){
  const done=S.queue.filter(id=>S.results[id]);
  const right=done.filter(id=>S.results[id].correct);
  const wrong=done.filter(id=>!S.results[id].correct);
  const skipped=S.queue.filter(id=>!S.results[id]);
  const pct=done.length?Math.round(right.length/done.length*100):0;
  const byExam=EXAMS.map(e=>{
    const d=done.filter(id=>BY_ID[id].exam.includes(e));
    return [e,d.filter(id=>S.results[id].correct).length,d.length];
  }).filter(x=>x[2]>0);
  const item = id=>`<button type="button" data-rev="${id}">유형 ${String(id).padStart(2,"0")} · ${BY_ID[id].title} <span class="freq f${BY_ID[id].freq}">${freqDots(BY_ID[id].freq)}</span></button>`;
  wrong.sort((a,b)=>BY_ID[b].freq-BY_ID[a].freq);

  app.innerHTML = `
  <section class="sheet omr"><div class="pad">
    <h2>채점 결과</h2>
    <div class="big">${right.length}<small> / ${done.length}문제 · ${pct}%</small></div>
    ${skipped.length?`<p class="lead">건너뛴 문제 ${skipped.length}개는 채점에서 빠졌습니다.</p>`:""}
    <div class="breakdown">${byExam.map(([e,r,t])=>`<div class="bd"><b>${r}/${t}</b><span>${e} 관련 문제</span></div>`).join("")}</div>

    <h2 style="margin-top:22px">틀린 문제</h2>
    ${wrong.length?`<p class="hint" style="margin-top:-6px">출제율이 높은 문제부터 정렬했습니다. 위쪽부터 복습하세요.</p>`:""}
    ${wrong.length?`<div class="wlist">${wrong.map(item).join("")}</div>`:`<p class="empty">틀린 문제가 없습니다.</p>`}
    ${skipped.length?`<h2 style="margin-top:22px">건너뛴 문제</h2><div class="wlist">${skipped.map(item).join("")}</div>`:""}

    <div class="cta">
      ${wrong.length?`<button type="button" class="btn omrbtn" id="retryWrong">틀린 문제만 다시 풀기</button>`:""}
      <button type="button" class="btn" id="retryAll">같은 범위 다시 풀기</button>
      <button type="button" class="btn ghost" id="toHome">설정으로</button>
    </div>
    <p class="hint">틀린 문제는 이 브라우저의 오답노트에 저장됩니다. 설정 화면의 '오답노트' 범위로 언제든 다시 풀 수 있습니다.</p>
  </div></section>`;
  app.querySelectorAll("[data-rev]").forEach(b=>b.onclick=()=>go(S.queue.indexOf(+b.dataset.rev)));
  const rw=document.getElementById("retryWrong"); if(rw) rw.onclick=()=>start(wrong);
  document.getElementById("retryAll").onclick=()=>start(S.queue.slice().sort((a,b)=>a-b));
  document.getElementById("toHome").onclick=renderHome;
  window.scrollTo({top:0});
}

/* =========================================================
   키보드, 테마
   ========================================================= */
document.addEventListener("keydown",e=>{
  if(!S.queue.length || !app.querySelector(".qtext")) return;
  if(e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea, select, [contenteditable]")) return;
  if(e.key==="Enter" && e.target.closest("button, a")) return;
  const k=e.key.toUpperCase();
  const id=S.queue[S.idx];
  const map={"1":0,"2":1,"3":2,"4":3,"A":0,"B":1,"C":2,"D":3};
  if(k in map && app.querySelector("[data-opt]") && !S.results[id]){ e.preventDefault(); choose(S.optOrder[id][map[k]]); }
  else if(e.key==="ArrowRight"||(e.key==="Enter"&&S.results[id])){ e.preventDefault(); S.idx===S.queue.length-1?renderResult():go(S.idx+1); }
  else if(e.key==="ArrowLeft"){ e.preventDefault(); go(S.idx-1); }
});

document.getElementById('homeBtn').onclick = renderHome;
renderHome();
}

init().catch(showLoadError);
