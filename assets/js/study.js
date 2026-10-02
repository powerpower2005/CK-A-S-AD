// Pure study rules shared by the browser and regression checks.
export function selectCases(cases, { scope, part, exam }, wrong) {
  return cases.map(c => ({ ...c, steps: c.steps.filter(q =>
    (!part || q.part === Number(part)) && (!exam || q.exam.includes(exam))
  ) })).filter(c => c.steps.length && (scope !== 'wrong' || c.steps.some(q => wrong.has(q.id))));
}

export function summarize(queue, cases, results) {
  const total = queue.reduce((n, id) => n + cases[id].steps.length, 0);
  const submitted = queue.reduce((n, id) => n + (results[id]?.details.length || 0), 0);
  const earned = queue.reduce((n, id) => n + (results[id]?.earned || 0), 0);
  return { total, submitted, earned, unanswered: total - submitted, percent: total ? Math.round(earned / total * 100) : 0 };
}

export function remainingSeconds(deadline, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function dataSignature(data) {
  let hash = 2166136261;
  const source = JSON.stringify([data.questions, data.scenarios]);
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}

export function validSession(saved, signature, cases) {
  if (!saved || saved.signature !== signature || !Array.isArray(saved.queue) || !saved.queue.length) return false;
  if (!Number.isInteger(saved.index) || saved.index < 0 || saved.index >= saved.queue.length) return false;
  if (!['study', 'exam'].includes(saved.practice) || !['question', 'result'].includes(saved.view)) return false;
  if (!['type', 'mc'].includes(saved.mode) || !saved.answers || !saved.results || !saved.orders || !saved.hints) return false;
  if (new Set(saved.queue).size !== saved.queue.length || saved.queue.some(id => !cases[id])) return false;
  if (saved.practice === 'exam' && (!Number.isFinite(saved.deadline) || typeof saved.finished !== 'boolean')) return false;
  for (const id of saved.queue) {
    if (!saved.answers[id] || typeof saved.answers[id] !== 'object') return false;
    for (const q of cases[id].steps) {
      const order = saved.orders[q.id];
      if (!Array.isArray(order) || order.length !== 4 || new Set(order).size !== 4 || order.some(i => !Number.isInteger(i) || i < 0 || i > 3)) return false;
      const a = saved.answers[id][q.id];
      if (a && (a.mode === 'type' ? typeof a.value !== 'string' : a.mode !== 'mc' || (a.choice !== undefined && (!Number.isInteger(a.choice) || a.choice < 0 || a.choice > 3)))) return false;
    }
    const r = saved.results[id];
    if (r) {
      if (!Array.isArray(r.details) || r.details.some(d => !cases[id].steps.some(q => q.id === d.id) || typeof d.correct !== 'boolean')) return false;
      const earned = r.details.filter(d => d.correct).length, complete = r.details.length === cases[id].steps.length;
      if (new Set(r.details.map(d => d.id)).size !== r.details.length || r.earned !== earned || r.total !== r.details.length || r.complete !== complete || r.correct !== (complete && earned === r.total)) return false;
    }
  }
  return true;
}
