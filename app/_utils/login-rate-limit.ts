interface AttemptRecord {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();

const readPositiveInt = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const getLoginRateLimitConfig = (): {
  maxAttempts: number;
  windowMs: number;
} | null => {
  const maxAttempts = readPositiveInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS);
  if (!maxAttempts) return null;

  const minutes = readPositiveInt(process.env.AUTH_LOCKOUT_MINUTES) ?? 15;
  return { maxAttempts, windowMs: minutes * 60 * 1000 };
};

export const getClientKey = (headers: Headers): string => {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
};

export const getLockoutRemainingMs = (
  key: string,
  now: number = Date.now()
): number => {
  const config = getLoginRateLimitConfig();
  if (!config) return 0;

  const record = attempts.get(key);
  if (!record) return 0;

  if (record.lockedUntil > now) return record.lockedUntil - now;

  if (now - record.firstFailureAt > config.windowMs) {
    attempts.delete(key);
  }
  return 0;
};

export const registerFailedLogin = (
  key: string,
  now: number = Date.now()
): void => {
  const config = getLoginRateLimitConfig();
  if (!config) return;

  const existing = attempts.get(key);
  const record =
    existing && now - existing.firstFailureAt <= config.windowMs
      ? existing
      : { failures: 0, firstFailureAt: now, lockedUntil: 0 };

  record.failures += 1;
  if (record.failures >= config.maxAttempts) {
    record.lockedUntil = now + config.windowMs;
  }
  attempts.set(key, record);
};

export const clearFailedLogins = (key: string): void => {
  attempts.delete(key);
};

export const resetLoginRateLimit = (): void => {
  attempts.clear();
};
