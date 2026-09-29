// Browser-only preferences and per-subject wrong answers. No server is needed.
export const store = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* Practice still works when browser storage is unavailable. */ }
  },
};

const prefix = 'ck-a-s-ad:v1:';
export const themeKey = `${prefix}theme`;

export function loadWrong(subjectId, questionIds) {
  const saved = store.get(`${prefix}${subjectId}:wrong`, []);
  const known = new Set(questionIds);
  return new Set((Array.isArray(saved) ? saved : []).filter(id => known.has(id)));
}

export function saveWrongAnswers(subjectId, ids) {
  store.set(`${prefix}${subjectId}:wrong`, ids);
}
