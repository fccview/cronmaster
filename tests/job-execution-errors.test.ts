import { describe, expect, it } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import { describeJobExecutionError } from "@/app/_utils/job-execution-utils";

const execAsync = promisify(exec);

const failureOf = async (command: string, timeout?: number) => {
  try {
    await execAsync(command, { timeout });
  } catch (error) {
    return error;
  }
  throw new Error("expected the command to fail");
};

describe("describeJobExecutionError with real exec failures", () => {
  it("reports the exit code and stderr", async () => {
    const result = describeJobExecutionError(
      await failureOf("echo boom 1>&2; exit 3")
    );
    expect(result).toEqual({ message: "Job exited with code 3", output: "boom" });
  });

  it("reports a timeout", async () => {
    const result = describeJobExecutionError(await failureOf("sleep 5", 100));
    expect(result.message).toMatch(/^Job timed out after/);
  });
});
