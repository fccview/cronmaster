import { createHash, timingSafeEqual } from "crypto";
import { isSafeUsername } from "./shell-utils";

export const safeCompare = (provided: unknown, expected: unknown): boolean => {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }

  const providedDigest = createHash("sha256").update(provided).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();

  return timingSafeEqual(providedDigest, expectedDigest);
};

export const isSafePathSegment = (name: unknown): name is string =>
  typeof name === "string" &&
  name.length > 0 &&
  name.length <= 255 &&
  name !== "." &&
  name !== ".." &&
  !/[\/\\\0]/.test(name);

export const assertSafeUsername = (user: unknown): string => {
  if (typeof user !== "string" || !isSafeUsername(user)) {
    throw new Error("Invalid crontab user");
  }
  return user;
};

const CRON_MACRO_PATTERN = /^@[A-Za-z]+$/;
const CRON_FIELD_PATTERN = /^[0-9A-Za-z*?,\/#~-]+$/;

export const isValidCronSchedule = (schedule: unknown): schedule is string => {
  if (typeof schedule !== "string") return false;
  if (/[\x00-\x08\x0a-\x1f\x7f]/.test(schedule)) return false;

  const trimmed = schedule.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("@")) {
    return CRON_MACRO_PATTERN.test(trimmed);
  }

  const fields = trimmed.split(/\s+/);
  return (
    fields.length === 5 && fields.every((field) => CRON_FIELD_PATTERN.test(field))
  );
};

export const toSingleLine = (value: string | null | undefined): string =>
  (value || "").replace(/[\r\n]+/g, " ");

export const isSafeJobId = (id: unknown): id is string =>
  typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);

export const debugDetails = (error: unknown): string | undefined =>
  process.env.DEBUGGER && error instanceof Error ? error.stack : undefined;
