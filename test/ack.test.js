import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hasAcknowledged, ackNotice } from '../plugins/bashpass/lib/ack.js';

test('ack: returns false when file missing', () => {
  const home = mkdtempSync(join(tmpdir(), 'bashpass-ack-'));
  assert.equal(hasAcknowledged(join(home, '.bashpass-acknowledged')), false);
  rmSync(home, { recursive: true });
});

test('ack: returns true when file exists', () => {
  const home = mkdtempSync(join(tmpdir(), 'bashpass-ack-'));
  const ackPath = join(home, '.bashpass-acknowledged');
  writeFileSync(ackPath, '');
  assert.equal(hasAcknowledged(ackPath), true);
  rmSync(home, { recursive: true });
});

test('ack: notice contains touch command', () => {
  assert.match(ackNotice(), /touch.*bashpass-acknowledged/);
});

test('ack: notice contains both 中文 and English summaries', () => {
  const notice = ackNotice();
  assert.match(notice, /免责/);
  assert.match(notice, /disclaimer/i);
});
