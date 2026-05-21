import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', 'plugins', 'bashpass', 'hooks', 'pre-tool-use.js');

function ensureAck() {
  const ackDir = join(homedir(), '.claude');
  mkdirSync(ackDir, { recursive: true });
  writeFileSync(join(ackDir, '.bashpass-acknowledged'), '');
}

function runHook(payload) {
  ensureAck();
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

function runHookWithDebug(payload) {
  ensureAck();
  const proc = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, BASHPASS_DEBUG: '1' },
  });
  return { stdout: proc.stdout, stderr: proc.stderr, status: proc.status };
}

test('hook debug: emits decision log on allow', () => {
  const out = runHookWithDebug({ tool_name: 'Bash', tool_input: { command: 'ls -la' } });
  assert.match(out.stderr, /\[bashpass\] decision=allow/);
});

test('hook debug: emits decision log on deny', () => {
  const out = runHookWithDebug({ tool_name: 'Bash', tool_input: { command: 'sudo rm' } });
  assert.match(out.stderr, /\[bashpass\] decision=deny/);
});

test('hook debug: silent without env var', () => {
  const out = runHook({ tool_name: 'Bash', tool_input: { command: 'ls' } });
  assert.doesNotMatch(out.stderr, /\[bashpass\]/);
});
