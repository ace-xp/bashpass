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
  while (i < input.length) {
    if (input.startsWith('$(', i)) {
      const close = findMatching(input, i + 2, '(', ')');
      if (close === -1) break;
      const inner = input.slice(i + 2, close);
      sink.push(...parseRecursive(inner));
      result += ' ';
      i = close + 1;
    } else if (input[i] === '`') {
      const close = input.indexOf('`', i + 1);
      if (close === -1) break;
      const inner = input.slice(i + 1, close);
      sink.push(...parseRecursive(inner));
      result += ' ';
      i = close + 1;
    } else {
      result += input[i];
      i++;
    }
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
  while (i < input.length) {
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
    if (!matched) {
      buffer += input[i];
      i++;
    }
  }
  if (buffer.length > 0) result.push(buffer);
  return result;
}
