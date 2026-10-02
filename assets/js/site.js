import { store, themeKey } from './storage.js';

// Resolve against this module so both / and /CK-A-S-AD/ hosting work.
export const siteRoot = new URL('../../', import.meta.url);
export const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

export async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  return response.json();
}

export async function initShell() {
  const root = document.documentElement;
  const savedTheme = store.get(themeKey, null);
  if (savedTheme === 'dark' || savedTheme === 'light') root.dataset.theme = savedTheme;
  const themeButton = document.getElementById('themeBtn');
  const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const updateThemeLabel = () => {
    themeButton.textContent = isDark() ? '라이트 모드' : '다크 모드';
    themeButton.setAttribute('aria-label', `${themeButton.textContent}로 전환`);
  };
  updateThemeLabel();
  themeButton.onclick = () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    store.set(themeKey, root.dataset.theme);
    updateThemeLabel();
  };

  const catalog = await loadJSON(new URL('data/catalog.json', siteRoot));
  const subjectId = document.body.dataset.subject;
  const subject = catalog.find(item => item.id === subjectId);
  if (subjectId && !subject) throw new Error('Unknown subject: ' + subjectId);
  const nav = document.getElementById('subjectNav');
  const pageId = document.body.dataset.page || subjectId;
  nav.innerHTML = [{ path: '', title: '전체 문제집', id: undefined }, ...catalog, { path: 'labs/', title: '직접 실행 실습', id: 'labs' }].map(item =>
    `<a href="${escapeHtml(new URL(item.path, siteRoot).href)}" ${item.id === pageId ? 'aria-current="page"' : ''}>${escapeHtml(item.title)}</a>`
  ).join('');
  if (subject) document.getElementById('homeBtn').textContent = `${subject.title} · 풀이 설정`;
  return subject || catalog;
}

export function showLoadError(error) {
  console.error(error);
  const app = document.getElementById('app');
  app.innerHTML = '<section class="sheet pad" role="alert"><h1>문제집을 불러오지 못했습니다.</h1><p class="lead">연결 상태를 확인하고 다시 시도해 주세요.</p><button type="button" class="btn" id="reloadBtn">다시 불러오기</button></section>';
  document.getElementById('reloadBtn').onclick = () => location.reload();
}
