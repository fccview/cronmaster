import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  formatGpuInfo,
  getOverallStatus,
  getStatus,
} from "@/app/_utils/system-stats-utils";
import { overallDetailsKey, statusLabelKey } from "@/app/_utils/status-utils";

type Messages = { [key: string]: string | Messages };

const en: Messages = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "..", "app", "_translations", "en.json"),
    "utf8"
  )
);

const hasKey = (key: string) =>
  typeof key
    .split(".")
    .reduce<string | Messages | undefined>(
      (node, part) => (node && typeof node === "object" ? node[part] : undefined),
      en
    ) === "string";

const t = (key: string) => `translated:${key}`;

describe("system status codes", () => {
  it("returns locale independent resource status codes", () => {
    const thresholds = { critical: 90, high: 80, moderate: 70 };
    expect(getStatus(95, thresholds)).toBe("critical");
    expect(getStatus(85, thresholds)).toBe("high");
    expect(getStatus(75, thresholds)).toBe("moderate");
    expect(getStatus(10, thresholds)).toBe("optimal");
  });

  it("returns an overall status code with no translated text", () => {
    expect(getOverallStatus(95, 10)).toEqual({ overall: "critical" });
    expect(getOverallStatus(10, 85)).toEqual({ overall: "warning" });
    expect(getOverallStatus(10, 10)).toEqual({ overall: "optimal" });
  });

  it("reports gpu availability as a code", () => {
    expect(formatGpuInfo(null, t).status).toBe("unknown");
    expect(
      formatGpuInfo(
        { controllers: [{ model: "RTX", vram: 8192 }] } as Parameters<
          typeof formatGpuInfo
        >[0],
        t
      ).status
    ).toBe("available");
  });

  it("maps every code the server sends to an existing translation", () => {
    const codes = [
      "optimal",
      "moderate",
      "high",
      "critical",
      "warning",
      "available",
      "connected",
      "unknown",
      "loading",
    ];
    for (const code of codes) {
      expect(hasKey(statusLabelKey(code))).toBe(true);
    }
    for (const code of ["optimal", "warning", "critical", "loading"]) {
      expect(hasKey(overallDetailsKey(code))).toBe(true);
    }
  });

  it("falls back to unknown for anything unexpected", () => {
    expect(statusLabelKey("Kritisch")).toBe("system.unknown");
    expect(overallDetailsKey("whatever")).toBe("system.unknown");
  });
});
