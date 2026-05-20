export function parseBashCommand(input) {
  const tokens = tokenize(input);
  const subcommands = [];
  if (tokens.length > 0) {
    subcommands.push({
      command: tokens[0],
      args: tokens.slice(1),
      rawText: input.trim(),
    });
  }
  return { subcommands };
}

function tokenize(input) {
  return input.trim().split(/\s+/).filter(Boolean);
}
