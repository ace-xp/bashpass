import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadUserAllowPatterns } from '../plugins/bashpass/lib/settings-loader.js';

function makeTmpHome(contents) {
  const home = mkdtempSync(join(tmpdir(), 'bashpass-test-'));
  writeFileSync(join(home, 'settings.json'), JSON.stringify(contents));
  return home;
}

test('loader: extracts Bash() rules from permissions.allow', () => {
  const home = makeTmpHome({
    permissions: { allow: ['Bash(git status:*)', 'Bash(ls)', 'Read(./)'] },
  });
  const patterns = loadUserAllowPatterns({ paths: [join(home, 'settings.json')] });
  assert.deepEqual(patterns, ['git status *', 'ls']);
  rmSync(home, { recursive: true });
});

test('loader: missing file returns empty', () => {
  const patterns = loadUserAllowPatterns({ paths: ['/nonexistent/path.json'] });
  assert.deepEqual(patterns, []);
});

test('loader: malformed JSON returns empty', () => {
  const home = mkdtempSync(join(tmpdir(), 'bashpass-test-'));
  writeFileSync(join(home, 'settings.json'), '{not json');
  const patterns = loadUserAllowPatterns({ paths: [join(home, 'settings.json')] });
  assert.deepEqual(patterns, []);
  rmSync(home, { recursive: true });
});

test('loader: merges multiple files (union)', () => {
  const home1 = makeTmpHome({ permissions: { allow: ['Bash(ls)'] } });
  const home2 = makeTmpHome({ permissions: { allow: ['Bash(pwd)'] } });
  const patterns = loadUserAllowPatterns({
    paths: [join(home1, 'settings.json'), join(home2, 'settings.json')],
  });
  assert.deepEqual(patterns.sort(), ['ls', 'pwd']);
  rmSync(home1, { recursive: true });
  rmSync(home2, { recursive: true });
});
