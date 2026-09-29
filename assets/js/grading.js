export const normalizeAnswer = value => value.toLowerCase().replace(/[\s`]/g, '').replace(/[']/g, '"').replace(/[,;]+$/, '');

export function gradeTyped(question, value) {
  const answer = normalizeAnswer(value);
  if (!answer) return false;
  // Full model answers must work even when the accepted keyword is short.
  if (answer === normalizeAnswer(question.type.model)) return true;
  return question.type.acc.some(item => {
    const key = normalizeAnswer(item);
    return answer === key || (key.length >= 6 && answer.includes(key));
  });
}

export function gradeScenario(steps, answers) {
  const details = steps.map(q => {
    const answer = answers[q.id];
    const correct = answer?.mode === 'type' ? gradeTyped(q, answer.value) : answer?.choice === q.a;
    return { id: q.id, correct, choice: answer?.choice, value: answer?.value };
  });
  const earned = details.filter(item => item.correct).length;
  return { correct: earned === steps.length, earned, total: steps.length, details };
}
