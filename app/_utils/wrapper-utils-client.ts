export const unwrapCommand = (command: string): string => {
  const wrapperPattern = /^(.+\/cron-log-wrapper\.sh)\s+"([^"]+)"\s+(.+)$/;

  const match = command.match(wrapperPattern);

  if (match && match[3]) {
    return match[3];
  }

  return command;
};

export const isCommandWrapped = (command: string): boolean => {
  const wrapperPattern = /\/cron-log-wrapper\.sh\s+"[^"]+"\s+/;
  return wrapperPattern.test(command);
};

export const extractJobIdFromWrappedCommand = (
  command: string
): string | null => {
  const wrapperPattern = /\/cron-log-wrapper\.sh\s+"([^"]+)"\s+/;

  const match = command.match(wrapperPattern);

  if (match && match[1]) {
    return match[1];
  }

  return null;
};
