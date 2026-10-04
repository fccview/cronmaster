const NON_LOGIN_SHELLS = ["nologin", "false", "true"];

export const DEFAULT_FALLBACK_SHELL = "/bin/sh";

export const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, "'\\''")}'`;

const SHELL_SAFE_WORD = /^[A-Za-z0-9_@%+=:,./-]+$/;

export const shellQuoteIfNeeded = (value: string): string =>
  SHELL_SAFE_WORD.test(value) ? value : shellQuote(value);

export const shellUnquote = (value: string): string => {
  const match = value.match(/^'((?:[^']|'\\'')*)'$/);
  if (match) return match[1].replace(/'\\''/g, "'");
  return value.replace(/^(["'])(.*)\1$/, "$2");
};

export const isSafeUsername = (username: string): boolean =>
  /^[^-\s:/][^\s:/]*$/.test(username);

export const isNonLoginShell = (shell: string): boolean => {
  const name = shell.trim().split("/").pop() || "";
  return NON_LOGIN_SHELLS.includes(name);
};

export const resolveExecutionShell = (
  userShell: string | null | undefined,
  configuredShell: string | undefined = process.env.EXECUTION_SHELL
): string | undefined => {
  const configured = configuredShell?.trim();
  if (configured) {
    return configured;
  }

  if (userShell && isNonLoginShell(userShell)) {
    return DEFAULT_FALLBACK_SHELL;
  }

  return undefined;
};
