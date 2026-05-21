import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchPattern, classifySubcommand } from '../plugins/bashpass/lib/matcher.js';

test('matchPattern: exact match', () => {
  assert.equal(matchPattern('pwd', 'pwd'), true);
  assert.equal(matchPattern('pwd', 'pwd -L'), false);
});

test('matchPattern: trailing wildcard', () => {
  assert.equal(matchPattern('git status*', 'git status'), true);
  assert.equal(matchPattern('git status*', 'git status -v'), true);
  assert.equal(matchPattern('git status*', 'git stash'), false);
});

test('matchPattern: middle wildcard', () => {
  assert.equal(matchPattern('rm -rf *', 'rm -rf /tmp'), true);
  assert.equal(matchPattern('rm -rf *', 'rm -rf'), false);
});

test('matchPattern: full wildcard', () => {
  assert.equal(matchPattern('*', 'anything goes'), true);
  assert.equal(matchPattern('*', ''), true);
});

test('matchPattern: special regex chars in pattern escaped', () => {
  assert.equal(matchPattern('echo a.b', 'echo a.b'), true);
  assert.equal(matchPattern('echo a.b', 'echo aXb'), false);
});

test('classifySubcommand: deny wins over allow', () => {
  const ruleSet = {
    allowPatterns: ['rm *'],
    denyPatterns: ['rm -rf *'],
  };
  const result = classifySubcommand({ rawText: 'rm -rf /tmp' }, ruleSet);
  assert.equal(result.decision, 'deny');
  assert.equal(result.matchedRule, 'rm -rf *');
});

test('classifySubcommand: allow when only allow matches', () => {
  const ruleSet = { allowPatterns: ['ls*'], denyPatterns: [] };
  const result = classifySubcommand({ rawText: 'ls -la' }, ruleSet);
  assert.equal(result.decision, 'allow');
});

test('classifySubcommand: unknown when nothing matches', () => {
  const ruleSet = { allowPatterns: ['ls*'], denyPatterns: ['rm *'] };
  const result = classifySubcommand({ rawText: 'some-custom-tool' }, ruleSet);
  assert.equal(result.decision, 'unknown');
  assert.equal(result.matchedRule, null);
});
