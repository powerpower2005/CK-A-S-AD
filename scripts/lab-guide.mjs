export function guideMarkdown(lab) {
  const block = text => `\n\`\`\`sh\n${text}\n\`\`\`\n`;
  return `# ${lab.title}\n\n개인 실습 클러스터에서 직접 실행하고 검증하세요. 이 가이드는 자동 실행·자동 채점을 하지 않습니다.\n\n## 준비 조건\n${lab.requirements.map(r => `- ${r}`).join('\n')}\n\n## 준비 명령\n${block(lab.setup)}${lab.files.map(f => `\n## ${f.name}\n\n\`\`\`yaml\n${f.content}\n\`\`\`\n`).join('')}\n## 작업 조건\n${lab.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n## 검증\n${lab.checks.map(c => `${block(c.command)}예상: ${c.expected}\n`).join('')}\n## 정리\n${block(lab.cleanup)}\n## 공식 문서\n${lab.docs.map(([t, u]) => `- [${t}](${u})`).join('\n')}\n\n실제 클러스터에서 예제를 일괄 실행한 검증은 포함하지 않습니다.\n`;
}
