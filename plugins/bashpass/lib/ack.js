import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function defaultAckPath() {
  return join(homedir(), '.claude', '.bashpass-acknowledged');
}

export function hasAcknowledged(path = defaultAckPath()) {
  return existsSync(path);
}

export function ackNotice() {
  return [
    '',
    '⚠️  bashpass 首次启用提示 / First-time notice',
    '',
    'bashpass 会自动放行内置安全命令、自动拒绝内置危险命令。',
    '使用前请先阅读 DISCLAIMER.md 中的免责声明。',
    '',
    'bashpass automatically allows safe built-in commands and denies dangerous ones.',
    'Please read DISCLAIMER.md before use.',
    '',
    '接受方式 / To accept, run:',
    '  touch ~/.claude/.bashpass-acknowledged',
    '',
    '在此之前 bashpass 不会改变任何权限决策。',
    'Until then bashpass will not change any permission decisions.',
    '',
  ].join('\n');
}
