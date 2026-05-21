import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', 'plugins', 'bashpass', 'hooks', 'pre-tool-use.js');

function runHook(payload) {
  const proc = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  return { stdout: proc.stdout, stderr: proc.stderr, status: proc.status };
}

test('hook: Read tool → allow', () => {
  const out = runHook({ tool_name: 'Read', tool_input: { file_path: '/x' } });
  const decision = JSON.parse(out.stdout);
  assert.equal(decision.hookSpecificOutput.permissionDecision, 'allow');
});

test('hook: Grep tool → allow', () => {
  const out = runHook({ tool_name: 'Grep', tool_input: { pattern: 'x' } });
  const decision = JSON.parse(out.stdout);
  assert.equal(decision.hookSpecificOutput.permissionDecision, 'allow');
});

test('hook: Bash safe builtin command → allow', () => {
  const out = runHook({ tool_name: 'Bash', tool_input: { command: 'ls -la' } });
  const decision = JSON.parse(out.stdout);
  assert.equal(decision.hookSpecificOutput.permissionDecision, 'allow');
});

test('hook: Bash dangerous builtin command → deny', () => {
  const out = runHook({ tool_name: 'Bash', tool_input: { command: 'sudo rm -rf /' } });
  const decision = JSON.parse(out.stdout);
  assert.equal(decision.hookSpecificOutput.permissionDecision, 'deny');
});

test('hook: Bash unknown command → no decision (empty JSON)', () => {
  const out = runHook({ tool_name: 'Bash', tool_input: { command: 'my-custom-tool xyz' } });
  const trimmed = out.stdout.trim();
  if (trimmed.length === 0) return;
  const decision = JSON.parse(trimmed);
  assert.equal(decision.hookSpecificOutput, undefined);
});

test('hook: Bash composite all-safe → allow', () => {
  const out = runHook({ tool_name: 'Bash', tool_input: { command: 'ls && git status | head' } });
  const decision = JSON.parse(out.stdout);
  assert.equal(decision.hookSpecificOutput.permissionDecision, 'allow');
});

test('hook: Bash composite with dangerous inner → deny', () => {
  const out = runHook({ tool_name: 'Bash', tool_input: { command: 'cd /tmp && sudo rm file' } });
  const decision = JSON.parse(out.stdout);
  assert.equal(decision.hookSpecificOutput.permissionDecision, 'deny');
});

test('hook: Edit tool → no decision (passthrough)', () => {
  const out = runHook({ tool_name: 'Edit', tool_input: { file_path: '/x' } });
  const trimmed = out.stdout.trim();
  if (trimmed.length === 0) return;
  const decision = JSON.parse(trimmed);
  assert.equal(decision.hookSpecificOutput, undefined);
});

test('hook: malformed Bash command → no decision (fail-safe)', () => {
  const out = runHook({ tool_name: 'Bash', tool_input: { command: "echo 'unclosed" } });
  const trimmed = out.stdout.trim();
  if (trimmed.length === 0) return;
  const decision = JSON.parse(trimmed);
  assert.equal(decision.hookSpecificOutput, undefined);
});
