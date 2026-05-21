import { test } from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeDecision } from '../plugins/bashpass/lib/decision.js';

test('decision: all allow → allow', () => {
  const result = synthesizeDecision([
    { decision: 'allow', matchedRule: 'ls*', subcmd: { rawText: 'ls' } },
    { decision: 'allow', matchedRule: 'git status*', subcmd: { rawText: 'git status' } },
  ]);
  assert.equal(result.permissionDecision, 'allow');
  assert.match(result.permissionDecisionReason, /ls\*/);
  assert.match(result.permissionDecisionReason, /git status\*/);
});

test('decision: any deny → deny', () => {
  const result = synthesizeDecision([
    { decision: 'allow', matchedRule: 'cd*', subcmd: { rawText: 'cd /tmp' } },
    { decision: 'deny', matchedRule: 'sudo *', subcmd: { rawText: 'sudo rm -rf /' } },
  ]);
  assert.equal(result.permissionDecision, 'deny');
  assert.match(result.permissionDecisionReason, /sudo/);
});

test('decision: any unknown (no deny) → null', () => {
  const result = synthesizeDecision([
    { decision: 'allow', matchedRule: 'ls*', subcmd: { rawText: 'ls' } },
    { decision: 'unknown', matchedRule: null, subcmd: { rawText: 'custom-tool' } },
  ]);
  assert.equal(result, null);
});

test('decision: empty array → null', () => {
  const result = synthesizeDecision([]);
  assert.equal(result, null);
});

test('decision: deny still wins when unknowns also present', () => {
  const result = synthesizeDecision([
    { decision: 'unknown', matchedRule: null, subcmd: { rawText: 'a' } },
    { decision: 'deny', matchedRule: 'sudo *', subcmd: { rawText: 'sudo b' } },
  ]);
  assert.equal(result.permissionDecision, 'deny');
});
