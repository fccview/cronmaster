export const LOG_LEVELS = ["error", "warn", "info", "debug"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_SCOPES = [
  "api:cronjobs",
  "api:scripts",
  "api:system",
  "auth",
  "auth:api",
  "auth:oidc",
  "auth:session",
  "backup",
  "crontab",
  "i18n",
  "job",
  "job:exec",
  "job:running",
  "logs",
  "logs:stream",
  "logs:watcher",
  "proxy",
  "scripts",
  "snippets",
  "sse",
  "system",
  "ui",
  "ui:auth",
  "ui:jobs",
  "ui:logs",
  "ui:scripts",
  "ui:sse",
  "ui:system",
  "ui:users",
  "wrapper",
] as const;

export type LogMeta = Record<string, unknown>;

export interface Logger {
  error: (message: string, meta?: LogMeta | unknown) => void;
  warn: (message: string, meta?: LogMeta | unknown) => void;
  info: (message: string, meta?: LogMeta | unknown) => void;
  debug: (message: string, meta?: LogMeta | unknown) => void;
  infoOnce: (key: string, message: string, meta?: LogMeta | unknown) => void;
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

const seenOnce = new Set<string>();

const isLogLevel = (value: unknown): value is LogLevel =>
  typeof value === "string" && (LOG_LEVELS as readonly string[]).includes(value);

const readEnv = (key: string): string | undefined => {
  try {
    return typeof process !== "undefined" ? process.env?.[key] : undefined;
  } catch {
    return undefined;
  }
};

const readPublicLogLevel = (): string | undefined => {
  try {
    return process.env.NEXT_PUBLIC_LOG_LEVEL;
  } catch {
    return undefined;
  }
};

export const resolveLogLevel = (): LogLevel => {
  const configured = (readEnv("LOG_LEVEL") || readPublicLogLevel())
    ?.trim()
    .toLowerCase();
  if (isLogLevel(configured)) return configured;
  if (readEnv("DEBUGGER")) return "debug";
  return "info";
};

const isJsonFormat = (): boolean => readEnv("LOG_FORMAT")?.toLowerCase() === "json";

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

  if (isJsonFormat()) {
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
    infoOnce: (key: string, message: string, meta?: unknown) => {
      const onceKey = `${scope}:${key}`;
      const level: LogLevel = seenOnce.has(onceKey) ? "debug" : "info";
      seenOnce.add(onceKey);
      log(level)(message, meta);
    },
    child: (sub: string) => createLogger(`${scope}:${sub}`),
    enabled,
  };
};

export const commandFailure = (error: unknown): LogMeta => {
  const failure = (error ?? {}) as { code?: unknown; signal?: unknown; stderr?: unknown };
  return {
    code: failure.code,
    signal: failure.signal,
    stderr: typeof failure.stderr === "string" ? failure.stderr.trim() : undefined,
  };
};
