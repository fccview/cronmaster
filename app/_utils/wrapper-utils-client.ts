const SH_C_PREFIX = /^sh -c '/;

export const toShellArg = (cmd: string): string =>
  SH_C_PREFIX.test(cmd) ? cmd : `sh -c '${cmd.replace(/'/g, "'\\''")}'`;

export const fromShellArg = (cmd: string): string => {
  const match = cmd.match(/^sh -c '([\s\S]*)'$/);
  if (!match) return cmd;
  return match[1].replace(/'\\''/g, "'");
};

const WRAPPER_PATH = String.raw`(?:'(?:[^']|'\\'')*\/cron-log-wrapper\.sh'|.+\/cron-log-wrapper\.sh)`;
const WRAPPED_COMMAND = new RegExp(
  String.raw`^(${WRAPPER_PATH})\s+"([^"]+)"\s+([\s\S]+)$`
);
const WRAPPER_MARKER = /\/cron-log-wrapper\.sh'?\s+"([^"]+)"\s+/;

export const unwrapCommand = (command: string): string => {
  const match = command.match(WRAPPED_COMMAND);

  if (match && match[3]) {
    return fromShellArg(match[3]);
  }

  return command;
};

export const isCommandWrapped = (command: string): boolean =>
  WRAPPER_MARKER.test(command);

export const extractJobIdFromWrappedCommand = (
  command: string
): string | null => {
  const match = command.match(WRAPPER_MARKER);

  if (match && match[1]) {
    return match[1];
  }

  return null;
};
