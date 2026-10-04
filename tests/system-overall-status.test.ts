import { describe, expect, it } from "vitest";
import { getOverallStatus } from "@/app/_utils/system-stats-utils";

describe("getOverallStatus with disks", () => {
  it("goes critical when the root disk is nearly full", () => {
    expect(
      getOverallStatus(10, 10, [{ usage: 99, inodes: { usage: 5 } }])
    ).toEqual({ overall: "critical" });
  });

  it("goes critical when inodes run out even if space is fine", () => {
    expect(
      getOverallStatus(10, 10, [{ usage: 20, inodes: { usage: 95 } }])
    ).toEqual({ overall: "critical" });
  });

  it("warns on the busiest of several disks", () => {
    expect(
      getOverallStatus(10, 10, [
        { usage: 30, inodes: null },
        { usage: 85, inodes: null },
      ])
    ).toEqual({ overall: "warning" });
  });

  it("stays optimal with healthy disks or no disk stats", () => {
    expect(
      getOverallStatus(10, 10, [{ usage: 40, inodes: { usage: 40 } }])
    ).toEqual({ overall: "optimal" });
    expect(getOverallStatus(10, 10, [])).toEqual({ overall: "optimal" });
  });
});
