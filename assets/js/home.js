import { escapeHtml as esc, initShell, siteRoot, showLoadError } from './site.js';

async function init() {
  const catalog = await initShell();
  const total = catalog.reduce((sum, subject) => sum + subject.count, 0);
  const steps = catalog.reduce((sum, subject) => sum + subject.stepCount, 0);
  document.getElementById('app').innerHTML = `
    <header class="library-heading">
      <p class="eyebrow">CKA / CKS / CKAD · PRACTICE NOTES</p>
      <h1>쿠버네티스 문제집</h1>
      <p class="lead">오늘 연습할 주제를 골라 보세요.<br>보기 없이 답을 떠올리고, 개인 클러스터 실습으로 실제 동작을 확인하세요.</p>
      <div class="library-meta"><span>${catalog.length}개 문제집</span><span>${total}개 시나리오 · ${steps}개 하위 문항</span><span>단계별 부분 점수</span></div>
    </header>
    <section class="subject-grid" aria-label="문제집 선택">
      ${catalog.map((subject, i) => `
        <a class="subject-card" href="${esc(new URL(subject.path, siteRoot).href)}">
          <div class="card-top"><span class="card-index">0${i + 1}</span><span class="card-parts">${subject.partCount}개 파트</span></div>
          <h2>${esc(subject.title)}</h2>
          <p>${esc(subject.summary)}</p>
          <div class="card-bottom"><span><strong>${subject.count}</strong> 과제 <small>· ${subject.stepCount}단계</small></span><span class="card-open">문제집 열기 <span aria-hidden="true">↗</span></span></div>
        </a>`).join('')}
    </section>
    <aside class="study-note"><span class="note-mark" aria-hidden="true">K</span><p><strong>답안과 진행은 이 브라우저에 저장됩니다.</strong><br>문제집 점수는 개념 회상 점수입니다. 직접 실행 실습은 개인 클러스터의 터미널에서 수행하고 본인이 결과를 확인합니다.</p></aside>
    <section class="sheet pad"><h2>실제 작업까지 연습하기</h2><p>20개 실습 가이드에서 준비 파일, 작업 조건, 검증 명령과 예상 결과를 확인하세요.</p><a class="btn" href="${esc(new URL('labs/', siteRoot).href)}">직접 실행 실습 열기</a></section>`;
}

init().catch(showLoadError);
