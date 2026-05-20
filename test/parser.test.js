import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBashCommand } from '../plugins/bashpass/lib/parser.js';

test('parse: single simple command', () => {
  const result = parseBashCommand('ls -la');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].command, 'ls');
  assert.deepEqual(result.subcommands[0].args, ['-la']);
  assert.equal(result.subcommands[0].rawText, 'ls -la');
});

test('parse: command with no args', () => {
  const result = parseBashCommand('pwd');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].command, 'pwd');
  assert.deepEqual(result.subcommands[0].args, []);
});

test('parse: command with multiple args', () => {
  const result = parseBashCommand('git status -v');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].command, 'git');
  assert.deepEqual(result.subcommands[0].args, ['status', '-v']);
});
