import { describe, expect, it } from "vitest";
import { parseCronExpression, toCronstrueLocale } from "@/app/_utils/parser-utils";

describe("cron expression locale", () => {
  it("maps the app zh locale to the cronstrue zh_CN locale", () => {
    expect(toCronstrueLocale("zh")).toBe("zh_CN");
    expect(toCronstrueLocale("de")).toBe("de");
    expect(toCronstrueLocale(undefined)).toBe("en");
  });

  it("describes schedules in chinese instead of falling back to english", () => {
    const result = parseCronExpression("0 9 * * 1-5", "zh");
    expect(result.isValid).toBe(true);
    expect(result.humanReadable).toMatch(/[一-鿿]/);
    expect(result.humanReadable).not.toMatch(/Monday/);
  });
});
