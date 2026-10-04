import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCronJobs: vi.fn(),
  addCronJob: vi.fn(),
  updateCronJob: vi.fn(),
  runJobSynchronously: vi.fn(),
  runJobInBackground: vi.fn(),
  isDocker: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/_server/actions/global", () => ({
  isDocker: mocks.isDocker,
  getHostDataPath: vi.fn(),
  getHostScriptsPath: vi.fn(),
}));

vi.mock("@/app/_utils/cronjob-utils", () => ({
  getCronJobs: mocks.getCronJobs,
  addCronJob: mocks.addCronJob,
  updateCronJob: mocks.updateCronJob,
  cleanupCrontab: vi.fn(),
  readUserCrontab: vi.fn(),
  writeUserCrontab: vi.fn(),
  findJobIndex: vi.fn(),
}));

vi.mock("@/app/_utils/job-execution-utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/_utils/job-execution-utils")>();
  return {
    ...actual,
    runJobSynchronously: mocks.runJobSynchronously,
    runJobInBackground: mocks.runJobInBackground,
  };
});

import {
  cloneCronJob,
  createCronJob,
  editCronJob,
  executeJob,
  runCronJob,
  toggleCronJobLogging,
} from "@/app/_server/actions/cronjobs";
import { describeJobExecutionError } from "@/app/_utils/job-execution-utils";

const job = {
  id: "abc12345",
  schedule: "* * * * *",
  command: "echo hello",
  comment: "say hi",
  user: "root",
  logsEnabled: false,
  paused: false,
};

const execError = (props: Record<string, unknown>) =>
  Object.assign(new Error("Command failed: echo hello"), props);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getCronJobs.mockReset().mockResolvedValue([job]);
  mocks.addCronJob.mockReset().mockResolvedValue(true);
  mocks.updateCronJob.mockReset().mockResolvedValue(true);
  mocks.runJobSynchronously.mockReset();
  mocks.runJobInBackground.mockReset();
  mocks.isDocker.mockReset().mockResolvedValue(false);
});

describe("running jobs", () => {
  it("turns a non-zero exit into a readable failure instead of throwing", async () => {
    mocks.runJobSynchronously.mockRejectedValue(
      execError({ code: 1, stderr: "boom\n", stdout: "" })
    );

    const result = await runCronJob(job.id);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Job exited with code 1");
    expect(result.output).toBe("boom");
  });

  it("reports timeouts clearly", async () => {
    mocks.runJobSynchronously.mockRejectedValue(
      execError({ killed: true, signal: "SIGTERM", code: null, stderr: "" })
    );

    const result = await runCronJob(job.id);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/timed out after 300 seconds/);
  });

  it("catches background start failures too", async () => {
    vi.stubEnv("LIVE_UPDATES", "true");
    mocks.getCronJobs.mockResolvedValue([{ ...job, logsEnabled: true }]);
    mocks.runJobInBackground.mockRejectedValue(new Error("spawn sh ENOENT"));

    const result = await runCronJob(job.id);

    expect(result).toMatchObject({ success: false, message: "spawn sh ENOENT" });
  });

  it("executeJob catches rejections in both modes", async () => {
    mocks.runJobSynchronously.mockRejectedValue(execError({ code: 2, stderr: "nope" }));
    mocks.runJobInBackground.mockRejectedValue(new Error("no pid"));

    await expect(executeJob(job.id, false)).resolves.toMatchObject({
      success: false,
      message: "Job exited with code 2",
      output: "nope",
    });
    await expect(executeJob(job.id, true)).resolves.toMatchObject({
      success: false,
      message: "no pid",
    });
  });

  it("passes successful runs through", async () => {
    mocks.runJobSynchronously.mockResolvedValue({
      success: true,
      message: "Cron job executed successfully",
      output: "hello",
      mode: "sync",
    });

    await expect(runCronJob(job.id)).resolves.toMatchObject({
      success: true,
      output: "hello",
    });
  });
});

describe("describeJobExecutionError", () => {
  it("falls back to stdout, then the error message", () => {
    expect(describeJobExecutionError(execError({ code: 3, stdout: "out" })).output).toBe("out");
    expect(describeJobExecutionError(new Error("weird")).message).toBe("weird");
    expect(describeJobExecutionError(undefined).message).toBe("Failed to execute cron job");
  });

  it("names the signal when a job is killed from outside", () => {
    expect(
      describeJobExecutionError(execError({ signal: "SIGKILL", killed: false })).message
    ).toBe("Job was terminated by SIGKILL");
  });
});

describe("surfacing wrapper errors", () => {
  const hostPathError = new Error(
    "Cannot determine the host data path for logging. Set HOST_DATA_DIR to the host directory mounted at /app/data, or check the Docker socket and /app/data mount."
  );

  it("createCronJob returns the real reason", async () => {
    mocks.addCronJob.mockRejectedValue(hostPathError);
    const form = new FormData();
    form.append("schedule", "* * * * *");
    form.append("command", "echo hi");
    form.append("user", "root");
    form.append("logsEnabled", "true");

    const result = await createCronJob(form);

    expect(result.success).toBe(false);
    expect(result.message).toContain("HOST_DATA_DIR");
  });

  it("editCronJob and toggleCronJobLogging return the real reason", async () => {
    mocks.updateCronJob.mockRejectedValue(hostPathError);
    const form = new FormData();
    form.append("id", job.id);
    form.append("schedule", job.schedule);
    form.append("command", job.command);
    form.append("logsEnabled", "true");

    expect((await editCronJob(form)).message).toContain("HOST_DATA_DIR");
    expect((await toggleCronJobLogging(job)).message).toContain("HOST_DATA_DIR");
  });
});

describe("cloneCronJob", () => {
  it("carries logging over and lets the clone get its own wrapper", async () => {
    mocks.getCronJobs.mockResolvedValue([
      {
        ...job,
        logsEnabled: true,
        command: `/app/data/cron-log-wrapper.sh "${job.id}" sh -c 'echo hello'`,
      },
    ]);

    const result = await cloneCronJob(job.id, "copy");

    expect(result.success).toBe(true);
    expect(mocks.addCronJob).toHaveBeenCalledWith(
      job.schedule,
      "echo hello",
      "copy",
      "root",
      true
    );
  });

  it("keeps logging off for jobs without it", async () => {
    await cloneCronJob(job.id, "copy");
    expect(mocks.addCronJob).toHaveBeenCalledWith(
      job.schedule,
      "echo hello",
      "copy",
      "root",
      false
    );
  });
});
