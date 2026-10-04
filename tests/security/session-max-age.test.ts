import { describe, expect, it, vi } from "vitest";
import { getSessionMaxAgeSeconds } from "@/app/_utils/session-utils";

describe("getSessionMaxAgeSeconds", () => {
  it("defaults to 30 days, same as before", () => {
    vi.stubEnv("SESSION_MAX_AGE_DAYS", "");
    expect(getSessionMaxAgeSeconds()).toBe(30 * 24 * 60 * 60);
  });

  it("honours SESSION_MAX_AGE_DAYS", () => {
    vi.stubEnv("SESSION_MAX_AGE_DAYS", "7");
    expect(getSessionMaxAgeSeconds()).toBe(7 * 24 * 60 * 60);
    vi.stubEnv("SESSION_MAX_AGE_DAYS", "0.5");
    expect(getSessionMaxAgeSeconds()).toBe(12 * 60 * 60);
  });

  it.each(["0", "-3", "abc", "Infinity"])("falls back to 30 days for %j", (value) => {
    vi.stubEnv("SESSION_MAX_AGE_DAYS", value);
    expect(getSessionMaxAgeSeconds()).toBe(30 * 24 * 60 * 60);
  });
});
