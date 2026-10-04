import { describe, expect, it } from "vitest";
import { formatBytes } from "@/app/_utils/format-utils";

describe("formatBytes", () => {
  it("keeps small sizes as whole bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("scales through the units", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10.0 MB");
    expect(formatBytes(3 * 1024 ** 4)).toBe("3.0 TB");
  });

  it("never runs off the end of the unit list or chokes on junk", () => {
    expect(formatBytes(2 * 1024 ** 6)).toBe("2048.0 PB");
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(NaN)).toBe("0 B");
  });
});
