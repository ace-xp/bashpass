export function matchPattern(pattern, text) {
  const regex = patternToRegex(pattern);
  return regex.test(text);
}

function patternToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regex = '^' + escaped.replace(/\*/g, '.*') + '$';
  return new RegExp(regex);
}

export function classifySubcommand(subcmd, ruleSet) {
  for (const pattern of ruleSet.denyPatterns) {
    if (matchPattern(pattern, subcmd.rawText)) {
      return { decision: 'deny', matchedRule: pattern };
    }
  }
  for (const pattern of ruleSet.allowPatterns) {
    if (matchPattern(pattern, subcmd.rawText)) {
      return { decision: 'allow', matchedRule: pattern };
    }
  }
  return { decision: 'unknown', matchedRule: null };
}
