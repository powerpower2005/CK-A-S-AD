import { escapeHtml as esc, initShell, siteRoot, showLoadError } from './site.js';

async function init() {
  const catalog = await initShell();
  const total = catalog.reduce((sum, subject) => sum + subject.count, 0);
  document.getElementById('app').innerHTML = `
    <header class="library-heading">
      <p class="eyebrow">CKA / CKS / CKAD · PRACTICE NOTES</p>
      <h1>쿠버네티스 문제집</h1>
      <p class="lead">오늘 연습할 주제를 골라 보세요.<br>문제를 풀고, 해설로 확인하고, 틀린 문제를 다시 익힙니다.</p>
      <div class="library-meta"><span>${catalog.length}개 문제집</span><span>총 ${total}문항</span><span>객관식 + 직접 입력</span></div>
    </header>
    <section class="subject-grid" aria-label="문제집 선택">
      ${catalog.map((subject, i) => `
        <a class="subject-card" href="${esc(new URL(subject.path, siteRoot).href)}">
          <div class="card-top"><span class="card-index">0${i + 1}</span><span class="card-parts">${subject.partCount}개 파트</span></div>
          <h2>${esc(subject.title)}</h2>
          <p>${esc(subject.summary)}</p>
          <div class="card-bottom"><span><strong>${subject.count}</strong> 문항</span><span class="card-open">문제집 열기 <span aria-hidden="true">↗</span></span></div>
        </a>`).join('')}
    </section>
    <aside class="study-note"><span class="note-mark" aria-hidden="true">K</span><p><strong>틀린 문제는 다시 만날 수 있어요.</strong><br>오답은 이 브라우저에 과목별로 저장됩니다. 각 문제집의 ‘오답노트’에서 복습하세요.</p></aside>`;
}

init().catch(showLoadError);
