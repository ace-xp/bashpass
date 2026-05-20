const SEPARATORS = ['&&', '||', ';', '|', '&'];

export function parseBashCommand(input) {
  const segments = splitBySeparators(input.trim());
  const subcommands = segments
    .map(seg => seg.trim())
    .filter(seg => seg.length > 0)
    .map(seg => {
      const tokens = seg.split(/\s+/).filter(Boolean);
      return {
        command: tokens[0] || '',
        args: tokens.slice(1),
        rawText: seg,
      };
    })
    .filter(s => s.command.length > 0);
  return { subcommands };
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
