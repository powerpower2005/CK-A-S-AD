import { initShell, loadJSON, siteRoot, escapeHtml as esc, showLoadError } from './site.js';
import { store } from './storage.js';

async function init() {
  await initShell();
  const { labs } = await loadJSON(new URL('data/labs.json', siteRoot));
  const app = document.getElementById('app');
  const key = 'ck-a-s-ad:v1:labs:checks';
  const stored = store.get(key, {});
  const progress = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  let exam = '', saving = true;
  const code = content => `<pre><code>${esc(content)}</code></pre>`;
  function save() {
    saving = store.set(key, progress);
    const status = document.getElementById('labSaveStatus');
    if (status) status.textContent = saving ? '자가 확인 기록은 이 브라우저에 저장됩니다.' : '브라우저 저장 불가 · 현재 탭에서만 기록됩니다.';
  }
  function entry(lab) {
    const signature = JSON.stringify([lab.setup, lab.tasks, lab.checks]);
    const saved = progress[lab.id];
    if (!saved || saved.signature !== signature || !Array.isArray(saved.checks) || saved.checks.length !== lab.checks.length || saved.checks.some(v => typeof v !== 'boolean') || typeof saved.solutionViewed !== 'boolean') progress[lab.id] = { signature, checks: lab.checks.map(() => false), solutionViewed: false };
    return progress[lab.id];
  }
  const fileURL = (lab, name) => esc(new URL(`labs/files/${lab.id}/${name}`, siteRoot).href);
  function renderList() {
    app.innerHTML = `<header class="library-heading"><p class="eyebrow">YOUR CLUSTER · YOUR TERMINAL</p><h1>직접 실행 실습</h1><p class="lead">사이트에서 가이드를 받고, 개인 실습 환경의 터미널에서 실행하세요.<br>각 작업의 결과는 검증 명령과 예상 결과를 비교해 직접 확인합니다.</p></header>
      <section class="sheet pad"><h2>어떻게 실행하나요?</h2><ol class="lab-flow"><li><b>별도 연습 환경 준비</b><p>본인의 Kubernetes 클러스터와 kubectl이 필요합니다. Windows에서는 WSL/Linux의 Bash 터미널로 가이드 명령을 실행하세요.</p></li><li><b>준비 파일 받고 작업하기</b><p>전용 폴더에서 준비 YAML과 명령으로 초기 상태를 만듭니다. 작업 조건을 읽고 직접 해결하세요.</p></li><li><b>실제 결과 확인하기</b><p>검증 명령을 실행해 예상 결과와 비교하고 자가 확인에 체크하세요. 막히면 예시 풀이를 펼칩니다.</p></li></ol>
      <p class="hint">이 사이트는 클러스터에 접속하거나 명령을 실행하지 않습니다. 체크리스트는 자가 확인 기록이며 자동 실습 채점·문제집 점수와 별개입니다.</p>
      <details><summary>처음 준비하는 경우 · 환경별 조건</summary><p>일반 Pod·Service·배포 실습에는 kind나 minikube 같은 개인 클러스터를 사용할 수 있습니다. 설치는 각 프로젝트의 공식 안내를 따르세요.</p><p><a href="https://kind.sigs.k8s.io/docs/user/quick-start/" target="_blank" rel="noopener">kind 시작 안내</a> · <a href="https://minikube.sigs.k8s.io/docs/start/" target="_blank" rel="noopener">minikube 시작 안내</a></p><p>NetworkPolicy 실습에는 정책을 강제하는 CNI가, PVC 실습에는 기본 StorageClass가 필요합니다. Helm·이미지 빌드는 해당 도구도 별도로 필요합니다.</p>${code('kubectl config current-context\nkubectl get nodes\nkubectl get storageclass')}<p>개인 연습 컨텍스트인지 확인한 뒤 진행하세요. 아래 예제는 운영 클러스터 변경이나 etcd 복구 같은 작업을 자동 실행하지 않습니다.</p></details></section>
      <div class="group lab-filter"><label class="gtitle" for="labExam">시험별 실습</label><select id="labExam"><option value="">전체</option><option>CKA</option><option>CKAD</option><option>CKS</option></select></div>
      <div class="wlist">${labs.filter(l => !exam || l.exam.includes(exam)).map(l => { const p = entry(l), n = p.checks.filter(Boolean).length; return `<button data-lab="${l.id}"><b>${esc(l.title)}</b><br><small>${l.exam.join(' · ')} · 권장 ${l.minutes}분 · 자가 확인 ${n}/${l.checks.length}</small></button>`; }).join('')}</div>`;
    const filter = document.getElementById('labExam'); filter.value = exam; filter.onchange = () => { exam = filter.value; renderList(); };
    app.querySelectorAll('[data-lab]').forEach(button => button.onclick = () => {
      const lab = labs.find(l => l.id === button.dataset.lab);
      history.replaceState(null, '', `#${lab.id}`); renderLab(lab); window.scrollTo({ top: 0 });
    });
  }
  function renderLab(lab) {
    const p = entry(lab);
    app.innerHTML = `<button class="back-settings" id="labList">실습 목록</button><section class="sheet pad"><p class="eyebrow">EXTERNAL TERMINAL PRACTICE</p><h1>${esc(lab.title)}</h1><p class="lead">${lab.exam.join(' · ')} · 권장 ${lab.minutes}분</p>
      <h2>준비 조건</h2><ul>${lab.requirements.map(r => `<li>${esc(r)}</li>`).join('')}</ul><p class="hint">${esc(lab.environment)} 공식 문서 대조: ${esc(lab.reviewedAt)} · 예시를 실제 클러스터에서 일괄 실행 검증한 자료는 아닙니다.</p>
      <h2>초기 상태 만들기</h2><p>개인 실습 컨텍스트와 전용 작업 폴더를 확인한 뒤 준비 명령을 실행하세요.</p>${code(lab.setup)}
      ${lab.files.map(f => `<details><summary>준비 파일: ${esc(f.name)}</summary>${code(f.content)}</details><a class="btn ghost" href="${fileURL(lab, f.name)}" download="${esc(f.name)}">${esc(f.name)} 받기</a>`).join('')}
      <h2>작업 조건</h2><ol>${lab.tasks.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <h2>검증 명령과 자가 확인</h2><p class="hint">실제 터미널 결과를 비교한 뒤 체크하세요. 사이트는 실행 결과를 수집하지 않습니다.</p>
      ${lab.checks.map((c, i) => `<div class="lab-check">${code(c.command)}<p><b>예상 결과:</b> ${esc(c.expected)}</p><label><input type="checkbox" data-check="${i}" ${p.checks[i] ? 'checked' : ''}> 이 결과를 직접 확인했습니다.</label></div>`).join('')}
      <p class="scenario-progress" id="labProgress" role="status">${progressText(lab)}</p><p class="hint" id="labSaveStatus">${saving ? '자가 확인 기록은 이 브라우저에 저장됩니다.' : '브라우저 저장 불가 · 현재 탭에서만 기록됩니다.'}</p>
      <details id="labSolution"><summary>예시 풀이 보기</summary>${code(lab.solution)}<p class="hint">현재 실습 조건의 한 가지 예시입니다. 다른 방법도 실제 검증 조건을 만족하면 됩니다.</p></details><p class="hint" id="labAssisted">${p.solutionViewed ? '예시 풀이를 참고한 기록이 있습니다.' : '예시 풀이를 아직 열지 않았습니다.'}</p>
      <h2>실습 자원 정리</h2><p>아래 명령은 이 실습의 namespace를 삭제합니다. PVC 사용 시 연결된 실제 저장소의 reclaimPolicy도 확인하세요.</p>${code(lab.cleanup)}
      <div class="docs">${lab.docs.map(([title, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}</a>`).join('')}</div><a class="btn" href="${fileURL(lab, `${lab.id}-guide.md`)}" download="${lab.id}-guide.md">실습 가이드 받기 (.md)</a></section>`;
    document.getElementById('labList').onclick = () => { history.replaceState(null, '', location.pathname + location.search); renderList(); window.scrollTo({ top: 0 }); };
    app.querySelectorAll('[data-check]').forEach(input => input.onchange = () => { p.checks[Number(input.dataset.check)] = input.checked; save(); document.getElementById('labProgress').textContent = progressText(lab); });
    document.getElementById('labSolution').ontoggle = event => {
      if (event.target.open) { p.solutionViewed = true; save(); document.getElementById('labAssisted').textContent = '예시 풀이를 참고한 기록이 있습니다.'; }
    };
  }
  function progressText(lab) { const n = entry(lab).checks.filter(Boolean).length; return `자가 확인 ${n}/${lab.checks.length}${n === lab.checks.length ? ' · 본인 확인 완료' : ''} · 자동 실행 검증 결과가 아닙니다.`; }
  const initial = labs.find(l => l.id === location.hash.slice(1));
  if (initial) renderLab(initial); else renderList();
}
init().catch(showLoadError);
