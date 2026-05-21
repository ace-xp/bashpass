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

test('parse: && chains', () => {
  const result = parseBashCommand('ls && git status');
  assert.equal(result.subcommands.length, 2);
  assert.equal(result.subcommands[0].rawText, 'ls');
  assert.equal(result.subcommands[1].rawText, 'git status');
});

test('parse: || chains', () => {
  const result = parseBashCommand('cmd1 || cmd2');
  assert.equal(result.subcommands.length, 2);
  assert.equal(result.subcommands[0].command, 'cmd1');
  assert.equal(result.subcommands[1].command, 'cmd2');
});

test('parse: ; separator', () => {
  const result = parseBashCommand('cd src ; ls ; pwd');
  assert.equal(result.subcommands.length, 3);
  assert.deepEqual(result.subcommands.map(s => s.command), ['cd', 'ls', 'pwd']);
});

test('parse: | pipe (single)', () => {
  const result = parseBashCommand('ls -la | grep foo');
  assert.equal(result.subcommands.length, 2);
  assert.equal(result.subcommands[0].rawText, 'ls -la');
  assert.equal(result.subcommands[1].rawText, 'grep foo');
});

test('parse: | distinguished from ||', () => {
  const result = parseBashCommand('a | b || c');
  assert.equal(result.subcommands.length, 3);
  assert.deepEqual(result.subcommands.map(s => s.command), ['a', 'b', 'c']);
});

test('parse: trailing & (background)', () => {
  const result = parseBashCommand('long-task &');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].rawText, 'long-task');
});

test('parse: mixed separators', () => {
  const result = parseBashCommand('ls && git status | head');
  assert.equal(result.subcommands.length, 3);
  assert.deepEqual(result.subcommands.map(s => s.rawText), ['ls', 'git status', 'head']);
});

test('parse: $(...) substitution exposes inner command', () => {
  const result = parseBashCommand('echo $(git rev-parse HEAD)');
  assert.equal(result.subcommands.length, 2);
  const cmds = result.subcommands.map(s => s.command);
  assert(cmds.includes('echo'));
  assert(cmds.includes('git'));
});

test('parse: nested $(...) all exposed', () => {
  const result = parseBashCommand('echo $(cat $(which node))');
  const cmds = result.subcommands.map(s => s.command).sort();
  assert.deepEqual(cmds, ['cat', 'echo', 'which']);
});

test('parse: backtick substitution exposes inner command', () => {
  const result = parseBashCommand('echo `whoami`');
  const cmds = result.subcommands.map(s => s.command);
  assert(cmds.includes('echo'));
  assert(cmds.includes('whoami'));
});

test('parse: $(...) combined with && still all exposed', () => {
  const result = parseBashCommand('cd $(git root) && ls');
  const cmds = result.subcommands.map(s => s.command);
  assert.deepEqual(cmds.sort(), ['cd', 'git', 'ls']);
});
