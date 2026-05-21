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

test('parse: && inside single quotes is literal', () => {
  const result = parseBashCommand("echo 'a && b'");
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].command, 'echo');
});

test('parse: $(...) inside single quotes is literal', () => {
  const result = parseBashCommand("echo '$(rm -rf /)'");
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].command, 'echo');
});

test('parse: $(...) inside double quotes is still expanded', () => {
  // POSIX: double quotes 内 $() 仍展开
  const result = parseBashCommand('echo "$(whoami)"');
  const cmds = result.subcommands.map(s => s.command);
  assert(cmds.includes('echo'));
  assert(cmds.includes('whoami'));
});

test('parse: backslash escapes next char', () => {
  const result = parseBashCommand('echo a\\&\\&b');
  assert.equal(result.subcommands.length, 1);
});

test('parse: unclosed single quote throws ParseError', () => {
  assert.throws(() => parseBashCommand("echo 'foo"), { name: 'ParseError' });
});

test('parse: unclosed $() throws ParseError', () => {
  assert.throws(() => parseBashCommand('echo $(whoami'), { name: 'ParseError' });
});

test('parse: unclosed backtick throws ParseError', () => {
  assert.throws(() => parseBashCommand('echo `whoami'), { name: 'ParseError' });
});

test('parse: empty input yields no subcommands', () => {
  const result = parseBashCommand('');
  assert.equal(result.subcommands.length, 0);
});

// ----- Redirect-aware splitting (& inside redirect must not split) -----

test('parse: 2>&1 does not split', () => {
  const result = parseBashCommand('cmd 2>&1');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].rawText, 'cmd 2>&1');
});

test('parse: >&2 does not split', () => {
  const result = parseBashCommand('cmd >&2');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].rawText, 'cmd >&2');
});

test('parse: 2>&- (close fd) does not split', () => {
  const result = parseBashCommand('cmd 2>&-');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].rawText, 'cmd 2>&-');
});

test('parse: <&0 (stdin dup) does not split', () => {
  const result = parseBashCommand('cmd <&0');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].rawText, 'cmd <&0');
});

test('parse: &>file (bash redirect both) does not split', () => {
  const result = parseBashCommand('cmd &> /dev/null');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].rawText, 'cmd &> /dev/null');
});

test('parse: &>>file (bash append both) does not split', () => {
  const result = parseBashCommand('cmd &>> /tmp/log');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].rawText, 'cmd &>> /tmp/log');
});

test('parse: ls 2>&1 | head splits exactly into 2 subcommands', () => {
  const result = parseBashCommand('ls "/tmp/foo" 2>&1 | head -20');
  assert.equal(result.subcommands.length, 2);
  assert.equal(result.subcommands[0].rawText, 'ls "/tmp/foo" 2>&1');
  assert.equal(result.subcommands[1].rawText, 'head -20');
});

// ----- Regression: existing behavior preserved -----

test('parse: regression — && still splits', () => {
  const result = parseBashCommand('cmd1 && cmd2');
  assert.equal(result.subcommands.length, 2);
  assert.deepEqual(result.subcommands.map(s => s.command), ['cmd1', 'cmd2']);
});

test('parse: regression — || still splits', () => {
  const result = parseBashCommand('cmd1 || cmd2');
  assert.equal(result.subcommands.length, 2);
  assert.deepEqual(result.subcommands.map(s => s.command), ['cmd1', 'cmd2']);
});

test('parse: regression — ; still splits', () => {
  const result = parseBashCommand('cmd1 ; cmd2');
  assert.equal(result.subcommands.length, 2);
});

test('parse: regression — | still splits', () => {
  const result = parseBashCommand('cmd1 | cmd2');
  assert.equal(result.subcommands.length, 2);
});

test('parse: regression — trailing & still splits (empty tail filtered)', () => {
  const result = parseBashCommand('long-task &');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].rawText, 'long-task');
});

test('parse: regression — cmd1 & cmd2 (background then run) still splits', () => {
  const result = parseBashCommand('cmd1 & cmd2');
  assert.equal(result.subcommands.length, 2);
  assert.deepEqual(result.subcommands.map(s => s.command), ['cmd1', 'cmd2']);
});

test('parse: regression — quoted && stays literal', () => {
  const result = parseBashCommand('echo "a && b"');
  assert.equal(result.subcommands.length, 1);
  assert.equal(result.subcommands[0].command, 'echo');
});

test('parse: regression — $(...) with 2>&1 inside still exposes inner cmd intact', () => {
  const result = parseBashCommand('echo $(other 2>&1)');
  const cmds = result.subcommands.map(s => s.command).sort();
  assert.deepEqual(cmds, ['echo', 'other']);
  const inner = result.subcommands.find(s => s.command === 'other');
  assert.equal(inner.rawText, 'other 2>&1');
});
