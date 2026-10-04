export const LOG_LEVELS = ["error", "warn", "info", "debug"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogMeta = Record<string, unknown>;

export interface Logger {
  error: (message: string, meta?: LogMeta | unknown) => void;
  warn: (message: string, meta?: LogMeta | unknown) => void;
  info: (message: string, meta?: LogMeta | unknown) => void;
  debug: (message: string, meta?: LogMeta | unknown) => void;
  child: (scope: string) => Logger;
  enabled: (level: LogLevel) => boolean;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const SENSITIVE_KEY = /pass(word)?|secret|token|cookie|authorization|api[-_]?key|session/i;

const REDACTED = "[redacted]";

const isLogLevel = (value: unknown): value is LogLevel =>
  typeof value === "string" && (LOG_LEVELS as readonly string[]).includes(value);

const readEnv = (key: string): string | undefined => {
  try {
    return typeof process !== "undefined" ? process.env?.[key] : undefined;
  } catch {
    return undefined;
  }
};

export const resolveLogLevel = (): LogLevel => {
  const configured = (readEnv("LOG_LEVEL") || readEnv("NEXT_PUBLIC_LOG_LEVEL"))
    ?.trim()
    .toLowerCase();
  if (isLogLevel(configured)) return configured;
  if (readEnv("DEBUGGER")) return "debug";
  return "info";
};

const useJson = (): boolean => readEnv("LOG_FORMAT")?.toLowerCase() === "json";

export const redact = (value: unknown, depth = 0): unknown => {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(entry, depth + 1);
  }
  return result;
};

const emit = (level: LogLevel, scope: string, message: string, meta?: unknown) => {
  const tag = `[cr*nmaster:${scope}]`;
  const safeMeta = meta === undefined ? undefined : redact(meta);

  if (useJson()) {
    console[level](
      JSON.stringify({
        time: new Date().toISOString(),
        level,
        scope,
        message,
        ...(safeMeta === undefined ? {} : { meta: safeMeta }),
      })
    );
    return;
  }

  const prefix = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${tag}`;
  if (safeMeta === undefined) {
    console[level](`${prefix} ${message}`);
  } else {
    console[level](`${prefix} ${message}`, safeMeta);
  }
};

export const createLogger = (scope: string): Logger => {
  const enabled = (level: LogLevel) =>
    LEVEL_WEIGHT[level] <= LEVEL_WEIGHT[resolveLogLevel()];

  const log = (level: LogLevel) => (message: string, meta?: unknown) => {
    if (enabled(level)) emit(level, scope, message, meta);
  };

  return {
    error: log("error"),
    warn: log("warn"),
    info: log("info"),
    debug: log("debug"),
    child: (sub: string) => createLogger(`${scope}:${sub}`),
    enabled,
  };
};
