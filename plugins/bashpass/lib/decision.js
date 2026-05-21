export function synthesizeDecision(classifications) {
  if (classifications.length === 0) return null;

  const denied = classifications.filter(c => c.decision === 'deny');
  if (denied.length > 0) {
    const reasons = denied.map(c => `"${c.subcmd.rawText}" 命中危险规则 ${c.matchedRule}`).join('；');
    return {
      permissionDecision: 'deny',
      permissionDecisionReason: `bashpass: ${reasons}`,
    };
  }

  const allAllow = classifications.every(c => c.decision === 'allow');
  if (allAllow) {
    const rules = [...new Set(classifications.map(c => c.matchedRule))].join(', ');
    return {
      permissionDecision: 'allow',
      permissionDecisionReason: `bashpass: 全部子命令命中安全规则 [${rules}]`,
    };
  }

  return null;
}
