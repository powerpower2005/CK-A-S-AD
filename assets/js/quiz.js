import { store, loadWrong, saveWrongAnswers } from './storage.js';
import { escapeHtml as esc, loadJSON, initShell, showLoadError, siteRoot } from './site.js';
import { gradeScenario } from './grading.js';
import { selectCases, summarize, remainingSeconds, dataSignature, validSession } from './study.js';

async function init() {
  const subject = await initShell();
  const data = await loadJSON(new URL('../../data/' + subject.id + '.json', import.meta.url));
  const questions = Object.fromEntries(data.questions.map(q => [q.id, q]));
  const cases = data.scenarios.map(c => ({ ...c, steps: c.steps.map(id => questions[id]) }));
  const app = document.getElementById('app');
  const signature = dataSignature(data), sessionKey = `ck-a-s-ad:v2:${subject.id}:session`;
  const wrong = loadWrong(subject.id, data.questions.map(q => q.id));
  const defaults = { scope: 'all', part: '', exam: '', order: 'seq', mode: 'type', practice: 'study', minutes: 30, limit: 10, queue: [], index: 0, answers: {}, results: {}, orders: {}, hints: {}, deadline: null, finished: false, view: 'question' };
  let S = { ...defaults }, byId = {}, saved = store.get(sessionKey, null), timer, saving = true, saveTimeout;
  const current = () => byId[S.queue[S.index]];
  const hasAnswer = a => a?.mode === 'type' ? !!a.value.trim() : Number.isInteger(a?.choice);
  const selected = () => selectCases(cases, S, wrong);
  const isExam = () => S.practice === 'exam';
  const isBlind = () => isExam() && !S.finished;
  function shuffle(items) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function persist() {
    if (!S.queue.length) return;
    saved = { ...S, signature, savedAt: Date.now() };
    saving = store.set(sessionKey, saved);
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = saving ? '이 브라우저에 자동 저장됨' : '브라우저 저장 불가 · 현재 탭에서만 유지됨';
  }
  function savedCases(candidate) {
    return Object.fromEntries(selectCases(cases, { ...candidate, scope: 'all' }, new Set()).map(c => [c.id, c]));
  }
  if (!validSession(saved, signature, savedCases(saved || defaults))) saved = null;
  function resume() {
    S = { ...defaults, ...saved }; byId = savedCases(S); armTimer();
    if (isBlind() && remainingSeconds(S.deadline) === 0) return finishExam();
    S.view === 'result' ? renderResult() : renderQuestion();
  }
  function armTimer() {
    clearInterval(timer);
    if (isBlind()) timer = setInterval(() => {
      const left = remainingSeconds(S.deadline), clock = document.getElementById('clock');
      if (clock) clock.textContent = formatTime(left);
      if (!left) finishExam();
    }, 1000);
  }
  const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  function openSettings() {
    clearTimeout(saveTimeout); if (S.queue.length) persist();
    if (isBlind()) { renderQuestion(); return; }
    clearInterval(timer);
    const { scope, part, exam, order, mode, practice, minutes, limit } = S;
    S = { ...defaults, scope, part, exam, order, mode, practice, minutes, limit };
    renderHome();
  }
  function renderHome() {
    const items = selected(), exams = [...new Set(data.questions.flatMap(q => q.exam))];
    app.innerHTML = `<section class="sheet omr"><div class="pad"><p class="eyebrow">RECALL & PRACTICE</p><h1>${esc(subject.title)} 학습</h1>
      <p class="lead">${cases.length}개 시나리오 · ${data.questions.length}개 문항<br>먼저 답을 떠올린 뒤 해설을 확인하세요. 이 점수는 개념 회상 점수입니다.</p>
      ${saved ? `<div class="resume-panel"><p>${saved.practice === 'exam' ? '시간 제한 연습' : '학습'} 기록 · ${saved.index + 1}/${saved.queue.length}번째 시나리오${saved.finished ? ' · 종료됨' : ''}</p><button class="btn" id="resume">저장된 풀이 이어보기</button></div>` : ''}
      <div class="filter-grid"><div class="group"><label class="gtitle" for="scope">출제 범위</label><select id="scope"><option value="all">전체</option><option value="wrong">오답이 있는 시나리오</option></select></div>
      <div class="group"><label class="gtitle" for="practice">학습 방식</label><select id="practice"><option value="study">학습 · 제출 후 해설</option><option value="exam">시간 제한 · 종료 후 해설</option></select></div></div>
      <div class="filter-grid"><div class="group"><label class="gtitle" for="part">파트</label><select id="part"><option value="">전체 파트</option>${Object.entries(data.parts).map(([id, label]) => `<option value="${id}">${esc(label)}</option>`).join('')}</select></div>
      <div class="group"><label class="gtitle" for="exam">시험</label><select id="exam"><option value="">전체 시험</option>${exams.map(e => `<option>${esc(e)}</option>`).join('')}</select></div></div>
      <p class="hint">선택한 시험·파트에 해당하는 문항만 출제합니다. 일부 단계만 선택하면 원래 시나리오의 부분 연습이 됩니다.</p>
      <div class="filter-grid"><div class="group"><label class="gtitle" for="order">순서</label><select id="order"><option value="seq">기본 순서</option><option value="rand">랜덤</option></select></div>
      <div class="group"><label class="gtitle" for="mode">답변 방식</label><select id="mode" ${isExam() ? 'disabled' : ''}><option value="type">직접 입력 · 보기 없이 회상</option><option value="mc">객관식 · 보기 참고</option></select></div></div>
      ${isExam() ? `<div class="filter-grid"><div class="group"><label class="gtitle" for="minutes">제한 시간 (분)</label><select id="minutes"><option value="15">15분</option><option value="30">30분</option><option value="60">60분</option><option value="120">120분</option></select></div><div class="group"><label class="gtitle" for="limit">시나리오 수</label><select id="limit"><option value="5">최대 5개</option><option value="10">최대 10개</option><option value="20">최대 20개</option><option value="0">선택한 전체</option></select></div></div><p class="hint">보기와 해설은 종료할 때 공개합니다. 미응답도 전체 점수에 포함합니다. 실제 시험의 클러스터 작업·배점을 재현하는 모의고사는 아닙니다.</p>` : '<p class="hint">직접 입력은 안내한 핵심어·등록 답안을 확인하는 학습 기능입니다. 동등한 다른 표현은 오답으로 표시될 수 있어 해설과 비교해 주세요. 실제 명령 실행 결과를 확인하는 채점은 아닙니다.</p>'}
      <div class="cta"><button class="btn omrbtn" id="start" ${items.length ? '' : 'disabled'}>${isExam() ? '시간 제한 연습 시작' : '학습 시작'}</button><span class="count">${items.length}개 시나리오 · ${items.reduce((n, c) => n + c.steps.length, 0)}개 문항</span></div>
      <p class="hint">새로 시작하면 기존 풀이 기록을 대체합니다. 오답 기록은 유지됩니다.</p>
      <a class="btn ghost" href="${esc(new URL('labs/', siteRoot).href)}">개인 클러스터 실습 · 준비와 검증 가이드</a>
      ${!isExam() ? `<details class="case-index"><summary>시나리오 목록에서 선택</summary><div class="wlist">${items.map(c => `<button data-case="${c.id}">${esc(c.title)} <small>· ${c.steps.length}문항</small></button>`).join('')}</div></details>` : ''}</div></section>`;
    for (const key of ['scope', 'part', 'exam', 'order', 'mode', 'practice', 'minutes', 'limit']) {
      const el = document.getElementById(key); if (!el) continue;
      el.value = S[key]; el.onchange = () => { S[key] = ['minutes', 'limit'].includes(key) ? Number(el.value) : el.value; if (isExam()) S.mode = 'type'; renderHome(); };
    }
    document.getElementById('resume')?.addEventListener('click', resume);
    document.getElementById('start').onclick = () => start(items);
    app.querySelectorAll('[data-case]').forEach(b => b.onclick = () => start(items.filter(c => c.id === b.dataset.case)));
  }
  function start(items) {
    clearTimeout(saveTimeout);
    const ordered = S.order === 'rand' ? shuffle(items) : items;
    const chosen = isExam() && S.limit ? ordered.slice(0, S.limit) : ordered;
    byId = Object.fromEntries(items.map(c => [c.id, c]));
    S.queue = chosen.map(c => c.id); S.index = 0; S.answers = {}; S.results = {}; S.orders = {}; S.hints = {}; S.finished = false;
    S.deadline = isExam() ? Date.now() + S.minutes * 60000 : null;
    for (const c of chosen) {
      S.answers[c.id] = {};
      c.steps.forEach(q => { S.orders[q.id] = shuffle([0, 1, 2, 3]); if (S.mode === 'mc') S.hints[q.id] = true; });
    }
    persist(); armTimer(); renderQuestion(); window.scrollTo({ top: 0 });
  }
  function gradeCase(c, includeMissing = false) {
    const existing = S.results[c.id]?.details || [];
    const fresh = c.steps.filter(q => !existing.some(r => r.id === q.id) && (includeMissing || hasAnswer(S.answers[c.id][q.id])));
    saveGrade(c, fresh, existing);
  }
  function saveGrade(c, fresh, existing) {
    const graded = gradeScenario(fresh, S.answers[c.id]), details = [...existing, ...graded.details];
    const earned = details.filter(r => r.correct).length, complete = details.length === c.steps.length;
    S.results[c.id] = { details, earned, total: details.length, complete, correct: complete && earned === details.length };
    graded.details.forEach(r => r.correct ? wrong.delete(r.id) : wrong.add(r.id));
    saveWrongAnswers(subject.id, [...wrong]); persist();
  }
  function finishExam() {
    if (!isBlind()) return;
    clearInterval(timer); clearTimeout(saveTimeout); S.finished = true;
    S.queue.forEach(id => gradeCase(byId[id], true)); persist(); renderResult();
  }
  function renderQuestion() {
    S.view = 'question'; persist();
    const c = current(), result = S.results[c.id], answers = S.answers[c.id], locked = isExam() && S.finished;
    app.innerHTML = `${isExam() ? `<div class="session-bar"><span>${S.finished ? '시간 제한 연습 종료' : '남은 시간'}</span><strong id="clock">${formatTime(remainingSeconds(S.deadline))}</strong>${!S.finished ? '<button class="btn ghost" id="finishExam">연습 종료 · 전체 채점</button>' : ''}</div>` : ''}
      <nav class="strip" aria-label="시나리오 진행">${S.queue.map((id, i) => `<button class="dot ${i === S.index ? 'cur' : ''} ${S.results[id]?.complete ? (S.results[id].correct ? 'ok' : 'no') : ''}" data-jump="${i}" aria-label="${i + 1}번째 시나리오">${i + 1}</button>`).join('')}</nav>
      <section class="sheet omr"><div class="pad"><div class="meta"><span class="qnum">시나리오 ${S.index + 1} / ${S.queue.length}</span><span class="tag">${c.steps.length}문항</span></div>
      <h1>${esc(c.title)}</h1><p class="lead">${esc(c.objective)}</p><p class="scenario-context">${esc(c.context)}</p><p class="hint" id="saveStatus">${saving ? '이 브라우저에 자동 저장됨' : '브라우저 저장 불가 · 현재 탭에서만 유지됨'}</p>
      <div class="scenario-progress" role="status" id="progress">${progressText(c)}</div>
      ${result?.complete ? `<div class="verdict ${result.correct ? 'ok' : 'no'}">${result.correct ? '문항 학습 완료 — 모든 문항 정답' : `정답 ${result.earned}/${c.steps.length} — 틀린 문항을 복습하세요.`}</div>` : ''}
      ${c.steps.map((q, i) => stepHTML(q, i, answers[q.id], result?.details.find(r => r.id === q.id), locked)).join('')}
      ${!isExam() && !result?.complete ? `<div class="submit-panel"><button class="btn omrbtn" id="submitCase" ${c.steps.some(q => !result?.details.some(r => r.id === q.id) && hasAnswer(answers[q.id])) ? '' : 'disabled'}>작성한 남은 답안 제출</button></div>` : ''}
      <div class="nav"><button class="btn ghost" id="prev" ${S.index === 0 ? 'disabled' : ''}>이전</button>${!isBlind() ? '<button class="btn ghost" id="results">결과 보기</button>' : ''}<button class="btn" id="next">${S.index === S.queue.length - 1 ? (isBlind() ? '연습 종료 · 전체 채점' : '결과 보기') : '다음'}</button></div></div></section>`;
    app.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => go(Number(b.dataset.jump)));
    app.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => {
      const id = Number(b.dataset.step); answers[id] = { mode: 'mc', choice: Number(b.dataset.choice) }; S.hints[id] = true;
      const y = window.scrollY; renderQuestion(); window.scrollTo({ top: y });
      app.querySelector(`[data-step="${id}"][data-choice="${b.dataset.choice}"]`)?.focus({ preventScroll: true });
    });
    app.querySelectorAll('[data-input]').forEach(input => input.oninput = () => {
      answers[Number(input.dataset.input)] = { mode: 'type', value: input.value };
      updateProgress(); clearTimeout(saveTimeout); saveTimeout = setTimeout(persist, 200);
    });
    app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
      const id = Number(b.dataset.mode), prev = answers[id]?.mode || S.mode;
      if (prev === 'type') { answers[id] = { mode: 'mc' }; S.hints[id] = true; } else answers[id] = { mode: 'type', value: '' };
      const y = window.scrollY; renderQuestion(); window.scrollTo({ top: y });
    });
    app.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
      try { await navigator.clipboard.writeText(questions[Number(b.dataset.copy)].code); b.textContent = '복사됨'; } catch { b.textContent = '복사 실패'; }
    });
    document.getElementById('submitCase')?.addEventListener('click', () => { gradeCase(c); renderQuestion(); });
    app.querySelectorAll('[data-submit-step]').forEach(b => b.onclick = () => {
      const q = questions[Number(b.dataset.submitStep)]; if (!hasAnswer(answers[q.id])) return;
      saveGrade(c, [q], S.results[c.id]?.details || []);
      const y = window.scrollY; renderQuestion(); window.scrollTo({ top: y }); document.getElementById(`feedback-${q.id}`).focus({ preventScroll: true });
    });
    document.getElementById('prev').onclick = () => go(S.index - 1);
    document.getElementById('next').onclick = () => S.index === S.queue.length - 1 ? (isBlind() ? finishExam() : renderResult()) : go(S.index + 1);
    document.getElementById('results')?.addEventListener('click', renderResult);
    document.getElementById('finishExam')?.addEventListener('click', finishExam);
  }
  function progressText(c) {
    const answered = c.steps.filter(q => hasAnswer(S.answers[c.id][q.id])).length;
    return isBlind() ? `작성 ${answered}/${c.steps.length}문항 · 종료 후 채점·해설 공개` : `제출 ${S.results[c.id]?.total || 0}/${c.steps.length}문항 · 정답 ${S.results[c.id]?.earned || 0}개`;
  }
  function updateProgress() {
    const c = current(); document.getElementById('progress').textContent = progressText(c);
    const submit = document.getElementById('submitCase');
    if (submit) submit.disabled = !c.steps.some(q => !S.results[c.id]?.details.some(r => r.id === q.id) && hasAnswer(S.answers[c.id][q.id]));
    app.querySelectorAll('[data-submit-step]').forEach(b => { b.disabled = !hasAnswer(S.answers[c.id][Number(b.dataset.submitStep)]); });
  }
  function stepHTML(q, index, answer, result, locked) {
    const mode = answer?.mode || S.mode;
    return `<section class="scenario-step" aria-labelledby="step-${q.id}"><h2 id="step-${q.id}"><span class="step-number">${index + 1}</span> 문항 ${index + 1}${result ? `<span class="step-verdict ${result.correct ? 'ok' : 'no'}">${result.correct ? '정답' : '오답'}</span>` : ''}</h2><div class="qtext">${q.q}</div>
      ${mode === 'type' ? `<div class="typebox"><label for="input-${q.id}">${q.type.p}</label><textarea rows="2" id="input-${q.id}" data-input="${q.id}" autocomplete="off" spellcheck="false" ${result || locked ? 'disabled' : ''} placeholder="위 안내에 맞는 답안을 입력하세요">${esc(answer?.value || '')}</textarea></div>` : `<div class="opts">${S.orders[q.id].map((oi, pos) => `<button class="opt ${answer?.choice === oi ? 'selected' : ''} ${result ? (oi === q.a ? 'right' : answer?.choice === oi ? 'wrong' : '') : ''}" data-step="${q.id}" data-choice="${oi}" aria-pressed="${answer?.choice === oi}" ${result || locked ? 'disabled' : ''}><span class="o">${'ABCD'[pos]}</span><span>${q.opts[oi]}</span></button>`).join('')}</div>`}
      ${S.hints[q.id] ? '<p class="hint">보기 참고 문항 · 도움 없이 회상한 정답 수에서 제외됩니다.</p>' : ''}
      ${result ? `<div class="exp" id="feedback-${q.id}" tabindex="-1"><p class="qtitle">${esc(q.title)} · 문항 ${q.id}</p><p><b>정답:</b> ${q.opts[q.a]}</p><p><b>모범 입력:</b> <code>${esc(q.type.model)}</code></p><h3>해설</h3>${q.exp}<details><summary>다른 보기 · 실습 예제 · 공식 문서</summary><ul>${q.whyno.map(w => `<li>${w}</li>`).join('')}</ul><div class="codewrap"><pre><code>${esc(q.code)}</code></pre><button class="copy" data-copy="${q.id}">복사</button></div><div class="trap">${q.trap}</div><div class="docs">${q.docs.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div></details></div>` : !isExam() ? `<button class="mini mode-switch" data-mode="${q.id}">${mode === 'type' ? '보기 힌트 사용' : '직접 입력으로 바꾸기'}</button><button class="btn omrbtn mode-switch" data-submit-step="${q.id}" ${hasAnswer(answer) ? '' : 'disabled'}>이 문항 제출</button>` : ''}</section>`;
  }
  function go(index) { if (index < 0 || index >= S.queue.length) return; clearTimeout(saveTimeout); S.index = index; renderQuestion(); window.scrollTo({ top: 0 }); }
  function renderResult() {
    S.view = 'result'; persist();
    const summary = summarize(S.queue, byId, S.results);
    const missingAnswers = S.queue.reduce((n, id) => n + byId[id].steps.filter(q => !hasAnswer(S.answers[id][q.id])).length, 0);
    const incorrect = S.queue.filter(id => S.results[id]?.details.some(r => !r.correct)), pending = S.queue.filter(id => !S.results[id]?.complete);
    const unaided = S.queue.reduce((n, id) => n + (S.results[id]?.details.filter(r => r.correct && !S.hints[r.id]).length || 0), 0);
    const list = ids => `<div class="wlist">${ids.map(id => `<button data-review="${id}">${esc(byId[id].title)} · 정답 ${S.results[id]?.earned || 0}/${byId[id].steps.length} · 제출 ${S.results[id]?.total || 0}</button>`).join('')}</div>`;
    app.innerHTML = `<section class="sheet omr"><div class="pad"><h1>${isExam() ? '시간 제한 연습' : '학습'} 결과</h1><div class="big">${summary.earned}<small> / ${summary.total}문항 · ${summary.percent}%</small></div><p class="lead">도움 없이 회상한 정답 ${unaided}개<br>제출 ${summary.submitted}/${summary.total}문항 · 미제출 ${summary.unanswered}문항</p><p class="hint">선택한 전체 문항을 분모로 계산합니다. 시간 제한 연습에서 미응답은 오답입니다. 이 점수는 실제 클러스터 작업 능력이나 시험 합격 가능성을 평가하지 않습니다.</p><h2>복습할 시나리오</h2>${incorrect.length ? list(incorrect) : '<p>제출한 문항에 오답이 없습니다.</p>'}${pending.length ? `<h2>이어서 풀 시나리오</h2>${list(pending)}` : ''}<details><summary>전체 문항과 해설 다시 보기</summary>${list(S.queue)}</details><div class="cta">${incorrect.length ? '<button class="btn omrbtn" id="retryWrong">오답 시나리오 다시 학습</button>' : ''}<button class="btn" id="retry">같은 범위 다시 학습</button><button class="btn ghost" id="settings">설정으로</button></div><a class="btn ghost" href="${esc(new URL('labs/', siteRoot).href)}">직접 실행할 실습 가이드</a></div></section>`;
    app.querySelectorAll('[data-review]').forEach(b => b.onclick = () => go(S.queue.indexOf(b.dataset.review)));
    const retry = ids => { S.practice = 'study'; S.mode = 'type'; start(ids.map(id => byId[id])); };
    document.getElementById('retryWrong')?.addEventListener('click', () => retry(incorrect));
    document.getElementById('retry').onclick = () => retry(S.queue);
    if (isExam()) app.querySelector('.lead').append(document.createTextNode(` · 미응답 ${missingAnswers}문항`));
    document.getElementById('settings').onclick = openSettings; window.scrollTo({ top: 0 });
  }
  document.getElementById('homeBtn').onclick = openSettings;
  window.addEventListener('pagehide', () => { clearTimeout(saveTimeout); persist(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); else if (isBlind() && !remainingSeconds(S.deadline)) finishExam(); });
  document.title = `쿠버네티스 ${subject.title} · 회상과 실습`;
  if (saved) resume(); else renderHome();
}
init().catch(showLoadError);
