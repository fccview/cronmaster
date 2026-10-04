import { beforeEach, describe, expect, it, vi } from "vitest";

const job = {
  id: "job-1",
  schedule: "0 3 * * *",
  command: "echo old",
  user: "alice",
};

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_utils/cronjob-utils", () => ({
  getCronJobs: vi.fn(async () => [job]),
  addCronJob: vi.fn(async () => true),
  updateCronJob: vi.fn(async () => true),
  readUserCrontab: vi.fn(),
  writeUserCrontab: vi.fn(),
  findJobIndex: vi.fn(),
}));
vi.mock("@/app/_utils/crontab-utils", () => ({ getAllTargetUsers: vi.fn() }));
vi.mock("@/app/_server/actions/global", () => ({ isDocker: vi.fn(async () => false) }));
vi.mock("@/app/_utils/job-execution-utils", () => ({
  runJobSynchronously: vi.fn(),
  runJobInBackground: vi.fn(),
}));
vi.mock("@/app/_utils/line-manipulation-utils", () => ({
  pauseJobInLines: vi.fn(),
  resumeJobInLines: vi.fn(),
  deleteJobInLines: vi.fn(),
}));
vi.mock("@/app/_utils/files-manipulation-utils", () => ({
  cleanCrontabContent: vi.fn(),
}));
vi.mock("@/app/_server/actions/scripts", () => ({
  fetchScripts: vi.fn(async () => [
    { id: "s1", name: "Backup", description: "", createdAt: "", filename: "backup.sh" },
  ]),
  getScriptPathForCron: vi.fn(async (filename: string) => `bash /host/scripts/${filename}`),
}));

const { createCronJob, editCronJob } = await import("@/app/_server/actions/cronjobs");
const { addCronJob, updateCronJob } = await import("@/app/_utils/cronjob-utils");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.append(key, value));
  return data;
};

describe("cron job actions with library scripts", () => {
  beforeEach(() => {
    vi.mocked(addCronJob).mockClear();
    vi.mocked(updateCronJob).mockClear();
  });

  it("creates a job from a selected script using the cron path", async () => {
    const result = await createCronJob(
      form({ schedule: "* * * * *", command: "", comment: "", user: "alice", selectedScriptId: "s1" })
    );
    expect(result.success).toBe(true);
    expect(addCronJob).toHaveBeenCalledWith(
      "* * * * *",
      "bash /host/scripts/backup.sh",
      "",
      "alice",
      false
    );
  });

  it("swaps an edited job onto a library script", async () => {
    const result = await editCronJob(
      form({
        id: "job-1",
        schedule: "0 4 * * *",
        command: "echo old",
        comment: "nightly",
        logsEnabled: "true",
        selectedScriptId: "s1",
      })
    );
    expect(result.success).toBe(true);
    expect(updateCronJob).toHaveBeenCalledWith(
      job,
      "0 4 * * *",
      "bash /host/scripts/backup.sh",
      "nightly",
      true
    );
  });

  it("keeps the typed command when editing without a script", async () => {
    await editCronJob(
      form({ id: "job-1", schedule: "0 4 * * *", command: "echo new", comment: "", logsEnabled: "false" })
    );
    expect(updateCronJob).toHaveBeenCalledWith(job, "0 4 * * *", "echo new", "", false);
  });

  it("refuses edits pointing at a script that vanished", async () => {
    const result = await editCronJob(
      form({ id: "job-1", schedule: "0 4 * * *", command: "", comment: "", selectedScriptId: "gone" })
    );
    expect(result).toEqual({ success: false, message: "Selected script not found" });
    expect(updateCronJob).not.toHaveBeenCalled();
  });

  it("still rejects edits with no command and no script", async () => {
    const result = await editCronJob(
      form({ id: "job-1", schedule: "0 4 * * *", command: "", comment: "" })
    );
    expect(result.success).toBe(false);
    expect(updateCronJob).not.toHaveBeenCalled();
  });
});
