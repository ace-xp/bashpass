import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { bashRuleToGlob } from './matcher.js';

export function loadUserAllowPatterns(options = {}) {
  const paths = options.paths || defaultSettingsPaths();
  const patterns = new Set();
  for (const p of paths) {
    try {
      const raw = readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      const allowList = data?.permissions?.allow;
      if (!Array.isArray(allowList)) continue;
      for (const rule of allowList) {
        const glob = bashRuleToGlob(rule);
        if (glob !== null) patterns.add(glob);
      }
    } catch {
      // 文件不存在或 JSON 无效 → 跳过，不抛错
    }
  }
  return [...patterns];
}

function defaultSettingsPaths() {
  return [
    join(process.cwd(), '.claude', 'settings.json'),
    join(homedir(), '.claude', 'settings.json'),
  ];
}
