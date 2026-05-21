const SEPARATORS = ['&&', '||', ';', '|', '&'];

export function parseBashCommand(input) {
  return { subcommands: parseRecursive(input.trim()) };
}

function parseRecursive(input) {
  const innerCommands = [];
  const stripped = extractSubstitutions(input, innerCommands);
  const outerSegments = splitBySeparators(stripped)
    .map(seg => seg.trim())
    .filter(seg => seg.length > 0);
  const outerSubcommands = outerSegments
    .map(seg => {
      const tokens = seg.split(/\s+/).filter(Boolean);
      return {
        command: tokens[0] || '',
        args: tokens.slice(1),
        rawText: seg,
      };
    })
    .filter(s => s.command.length > 0);
  return [...outerSubcommands, ...innerCommands];
}

function extractSubstitutions(input, sink) {
  let result = '';
  let i = 0;
  let quote = null; // null | "'" | '"'
  while (i < input.length) {
    const ch = input[i];
    if (quote === "'") {
      if (ch === "'") quote = null;
      result += ch;
      i++;
      continue;
    }
    if (ch === '\\' && i + 1 < input.length) {
      result += ch + input[i + 1];
      i += 2;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') { quote = null; result += ch; i++; continue; }
      // 双引号内仍展开 $() / 反引号
      if (input.startsWith('$(', i)) {
        const close = findMatching(input, i + 2, '(', ')');
        if (close === -1) break;
        sink.push(...parseRecursive(input.slice(i + 2, close)));
        result += ' ';
        i = close + 1;
        continue;
      }
      if (ch === '`') {
        const close = input.indexOf('`', i + 1);
        if (close === -1) break;
        sink.push(...parseRecursive(input.slice(i + 1, close)));
        result += ' ';
        i = close + 1;
        continue;
      }
      result += ch;
      i++;
      continue;
    }
    // unquoted
    if (ch === "'" || ch === '"') { quote = ch; result += ch; i++; continue; }
    if (input.startsWith('$(', i)) {
      const close = findMatching(input, i + 2, '(', ')');
      if (close === -1) break;
      sink.push(...parseRecursive(input.slice(i + 2, close)));
      result += ' ';
      i = close + 1;
      continue;
    }
    if (ch === '`') {
      const close = input.indexOf('`', i + 1);
      if (close === -1) break;
      sink.push(...parseRecursive(input.slice(i + 1, close)));
      result += ' ';
      i = close + 1;
      continue;
    }
    result += ch;
    i++;
  }
  return result;
}

function findMatching(input, start, open, close) {
  let depth = 1;
  for (let i = start; i < input.length; i++) {
    if (input[i] === open) depth++;
    else if (input[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitBySeparators(input) {
  const result = [];
  let buffer = '';
  let i = 0;
  let quote = null;
  while (i < input.length) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
      buffer += ch;
      i++;
      continue;
    }
    if (ch === '\\' && i + 1 < input.length) {
      buffer += ch + input[i + 1];
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; buffer += ch; i++; continue; }
    let matched = false;
    for (const sep of SEPARATORS) {
      if (input.startsWith(sep, i)) {
        result.push(buffer);
        buffer = '';
        i += sep.length;
        matched = true;
        break;
      }
    }
    if (!matched) { buffer += ch; i++; }
  }
  if (buffer.length > 0) result.push(buffer);
  return result;
}
