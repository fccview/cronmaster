import { beforeEach, describe, expect, it, vi } from "vitest";

const host = vi.hoisted(() => ({
  crontab: "",
  writes: [] as Array<{ user: string; content: string }>,
  writeOk: true,
}));

vi.mock("@/app/_server/actions/global", () => ({
  isDocker: vi.fn().mockResolvedValue(true),
  getHostDataPath: vi.fn().mockResolvedValue("/srv/cronmaster/data"),
  getHostScriptsPath: vi.fn(),
}));

vi.mock("@/app/_utils/crontab-utils", () => ({
  readAllHostCrontabs: vi.fn(async () => [{ user: "root", content: host.crontab }]),
  writeHostCrontabForUser: vi.fn(async (user: string, content: string) => {
    host.writes.push({ user, content });
    return host.writeOk;
  }),
  getAllTargetUsers: vi.fn().mockResolvedValue(["root"]),
  readHostCrontab: vi.fn(async () => host.crontab),
  writeHostCrontab: vi.fn(async (content: string) => {
    host.writes.push({ user: "(target)", content });
    return host.writeOk;
  }),
}));

import {
  addCronJob,
  getCronJobs,
  modifyJobInCrontab,
  updateCronJob,
} from "@/app/_utils/cronjob-utils";
import {
  deleteJobInLines,
  pauseJobInLines,
  updateJobInLines,
} from "@/app/_utils/line-manipulation-utils";

const crontab = [
  "# nightly | id: aaaa-1111",
  "0 3 * * * echo backup",
  "",
  "# hourly | id: bbbb-2222",
  "0 * * * * echo ping",
].join("\n");

const jobRef = (id: string, schedule: string, command: string) => ({
  id,
  schedule,
  command,
  user: "root",
});

beforeEach(() => {
  host.crontab = crontab;
  host.writes = [];
  host.writeOk = true;
});

describe("modifyJobInCrontab", () => {
  it("rewrites only the targeted job", async () => {
    const result = await modifyJobInCrontab(
      jobRef("bbbb-2222", "0 * * * *", "echo ping"),
      (lines, index) => deleteJobInLines(lines, index)
    );

    expect(result).toBe("updated");
    expect(host.writes).toHaveLength(1);
    expect(host.writes[0].content).toContain("echo backup");
    expect(host.writes[0].content).not.toContain("echo ping");
  });

  it("pauses through the same path", async () => {
    await modifyJobInCrontab(
      jobRef("aaaa-1111", "0 3 * * *", "echo backup"),
      (lines, index) => pauseJobInLines(lines, index, "aaaa-1111")
    );

    host.crontab = host.writes[0].content;
    const jobs = await getCronJobs(false);
    expect(jobs.find((job) => job.id === "aaaa-1111")?.paused).toBe(true);
    expect(jobs.find((job) => job.id === "bbbb-2222")?.paused).toBeFalsy();
  });

  it("reports a missing job without touching the crontab", async () => {
    const result = await modifyJobInCrontab(
      jobRef("cccc-3333", "1 1 * * *", "echo nope"),
      (lines) => lines
    );

    expect(result).toBe("not-found");
    expect(host.writes).toHaveLength(0);
  });

  it("reports a failed write", async () => {
    host.writeOk = false;
    const result = await modifyJobInCrontab(
      jobRef("aaaa-1111", "0 3 * * *", "echo backup"),
      (lines) => lines
    );

    expect(result).toBe("write-failed");
  });
});

describe("crontab with variable lines", () => {
  const withVariables = [
    'MAILTO=""',
    "SHELL=/bin/bash",
    "# daily backup",
    "0 3 * * * /usr/local/bin/backup.sh",
    "*/5 * * * * echo hi",
  ].join("\n");

  const echoJob = async () => {
    const job = (await getCronJobs(false)).find((j) => j.command === "echo hi");
    return jobRef(job!.id, "*/5 * * * *", "echo hi");
  };

  beforeEach(() => {
    host.crontab = withVariables;
  });

  it("deletes the targeted job and keeps the variables", async () => {
    await modifyJobInCrontab(await echoJob(), (lines, index) => deleteJobInLines(lines, index));

    expect(host.writes[0].content.split("\n")).toEqual([
      'MAILTO=""',
      "SHELL=/bin/bash",
      "# daily backup",
      "0 3 * * * /usr/local/bin/backup.sh",
    ]);
  });

  it("updates the targeted job and keeps the variables", async () => {
    const job = await echoJob();
    await modifyJobInCrontab(job, (lines, index) =>
      updateJobInLines(lines, index, "*/10 * * * *", "echo hi", "", false, job.id)
    );

    const lines = host.writes[0].content.split("\n");
    expect(lines.slice(0, 4)).toEqual([
      'MAILTO=""',
      "SHELL=/bin/bash",
      "# daily backup",
      "0 3 * * * /usr/local/bin/backup.sh",
    ]);
    expect(lines.filter((line) => line.endsWith("echo hi"))).toEqual(["*/10 * * * * echo hi"]);
  });

  it("pauses the targeted job and keeps the variables", async () => {
    const job = await echoJob();
    await modifyJobInCrontab(job, (lines, index) => pauseJobInLines(lines, index, job.id));

    host.crontab = host.writes[0].content;
    expect(host.crontab).toContain("SHELL=/bin/bash");
    const jobs = await getCronJobs(false);
    expect(jobs.find((j) => j.command === "echo hi")?.paused).toBe(true);
    expect(jobs.find((j) => j.command === "/usr/local/bin/backup.sh")?.paused).toBeFalsy();
  });
});

describe("addCronJob", () => {
  it("appends to the named user's crontab", async () => {
    await expect(addCronJob("*/5 * * * *", "echo hi", "new", "root")).resolves.toBe(true);

    expect(host.writes[0].user).toBe("root");
    const lines = host.writes[0].content.split("\n");
    expect(lines.slice(0, 5)).toEqual(crontab.split("\n"));
    expect(lines[lines.length - 1]).toBe("*/5 * * * * echo hi");
    expect(lines[lines.length - 2]).toMatch(/^# new \| id: [a-z0-9]{4}-[a-z0-9]{4}$/);
  });

  it("falls back to the host target crontab when no user is given", async () => {
    host.crontab = "";
    await expect(addCronJob("*/5 * * * *", "echo hi", "")).resolves.toBe(true);

    expect(host.writes[0].user).toBe("(target)");
    expect(host.writes[0].content).toMatch(/^# id: [a-z0-9-]+\n\*\/5 \* \* \* \* echo hi$/);
  });
});

describe("updateCronJob logging toggle", () => {
  const job = jobRef("aaaa-1111", "0 3 * * *", "echo backup");

  it("wraps when logging gets enabled and unwraps when it is disabled", async () => {
    await updateCronJob(job, job.schedule, job.command, "nightly", true);
    const wrapped = host.writes[0].content.split("\n")[1];
    expect(wrapped).toContain("/srv/cronmaster/data/cron-log-wrapper.sh");
    expect(wrapped).toContain("echo backup");

    host.crontab = host.writes[0].content;
    const [enabled] = await getCronJobs(false);
    await updateCronJob(
      { ...job, command: enabled.command },
      job.schedule,
      enabled.command,
      "nightly",
      false
    );
    expect(host.writes[1].content.split("\n")[1]).toBe("0 3 * * * echo backup");
  });
});
