#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBashCommand, ParseError } from '../lib/parser.js';
import { classifySubcommand } from '../lib/matcher.js';
import { loadUserAllowPatterns } from '../lib/settings-loader.js';
import { synthesizeDecision } from '../lib/decision.js';
import { hasAcknowledged, ackNotice } from '../lib/ack.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const READ_ONLY_TOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']);

function loadBuiltinList(filename) {
  const p = join(__dirname, '..', 'data', filename);
  return JSON.parse(readFileSync(p, 'utf8')).patterns;
}

function emit(decision) {
  if (decision === null) {
    process.stdout.write('{}\n');
    return;
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      ...decision,
    },
  }) + '\n');
}

function main() {
  if (!hasAcknowledged()) {
    process.stderr.write(ackNotice());
    emit(null);
    return;
  }

  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    emit(null);
    return;
  }

  const toolName = input.tool_name;

  if (READ_ONLY_TOOLS.has(toolName)) {
    emit({
      permissionDecision: 'allow',
      permissionDecisionReason: `bashpass: ${toolName} 是只读工具，默认放行`,
    });
    return;
  }

  if (toolName !== 'Bash') {
    emit(null);
    return;
  }

  const command = input.tool_input?.command;
  if (typeof command !== 'string') {
    emit(null);
    return;
  }

  let parsed;
  try {
    parsed = parseBashCommand(command);
  } catch (e) {
    if (e instanceof ParseError) {
      emit(null);
      return;
    }
    throw e;
  }

  let allowPatterns, denyPatterns, userPatterns;
  try {
    allowPatterns = loadBuiltinList('builtin-allowlist.json');
    denyPatterns = loadBuiltinList('builtin-denylist.json');
    userPatterns = loadUserAllowPatterns();
  } catch {
    emit(null);
    return;
  }

  const ruleSet = {
    allowPatterns: [...allowPatterns, ...userPatterns],
    denyPatterns,
  };

  const classifications = parsed.subcommands.map(subcmd => ({
    ...classifySubcommand(subcmd, ruleSet),
    subcmd,
  }));

  const decision = synthesizeDecision(classifications);
  debugLog(toolName, command, decision, classifications);
  emit(decision);
}

function debugLog(toolName, command, decision, classifications) {
  if (process.env.BASHPASS_DEBUG !== '1') return;
  const verdict = decision === null ? 'passthrough' : decision.permissionDecision;
  const rules = [...new Set(classifications.map(c => c.matchedRule).filter(Boolean))].join(',');
  const line = `[bashpass] decision=${verdict} tool=${toolName} subcmds=${classifications.length} rules=[${rules}] cmd="${command.replace(/"/g, '\\"')}"\n`;
  process.stderr.write(line);
}

main();
