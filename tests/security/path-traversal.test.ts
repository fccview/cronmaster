import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
  headers: vi.fn(async () => ({ get: () => null })),
}));

let root: string;
let secret: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "cronmaster-traversal-"));
  const app = path.join(root, "app");
  mkdirSync(path.join(app, "data", "logs", "abcd-1234"), { recursive: true });
  mkdirSync(path.join(app, "data", "backup"), { recursive: true });
  mkdirSync(path.join(app, "scripts"), { recursive: true });

  writeFileSync(path.join(app, "data", "logs", "abcd-1234", "2026-10-04_10-00-00.log"), "job output");
  writeFileSync(
    path.join(app, "data", "backup", "abcd-1234.job"),
    JSON.stringify({ id: "abcd-1234", schedule: "* * * * *", command: "echo hi", user: "root" })
  );
  writeFileSync(path.join(app, "scripts", "hello.sh"), "# @id: s1\n# @title: hello\n\necho hello");

  secret = path.join(root, "secret.job");
  writeFileSync(secret, JSON.stringify({ id: "x", schedule: "* * * * *", command: "cat /etc/shadow", user: "root" }));
  writeFileSync(path.join(root, "secret.log"), "top secret");
  writeFileSync(path.join(root, "secret.sh"), "top secret script");

  vi.spyOn(process, "cwd").mockReturnValue(app);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.resetModules();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("log actions", () => {
  it("reads legit log files", async () => {
    const { getLogContent } = await import("@/app/_server/actions/logs");
    expect(await getLogContent("abcd-1234", "2026-10-04_10-00-00.log")).toBe("job output");
  });

  it.each([
    ["abcd-1234", "../../../../secret.log"],
    ["abcd-1234", "..%2f..%2f..%2fsecret.log"],
    ["../../..", "secret.log"],
    ["..", "../../secret.log"],
    ["abcd-1234", "<absolute>"],
  ])("refuses to read %s / %s", async (jobId, filename) => {
    const { getLogContent } = await import("@/app/_server/actions/logs");
    const target = filename === "<absolute>" ? path.join(root, "secret.log") : filename;
    const result = await getLogContent(jobId, target);
    expect(result).not.toContain("top secret");
  });

  it("refuses to delete outside the job log folder", async () => {
    const { deleteLogFile } = await import("@/app/_server/actions/logs");
    const result = await deleteLogFile("abcd-1234", "../../../../secret.log");
    expect(result.success).toBe(false);
    expect(existsSync(path.join(root, "secret.log"))).toBe(true);

    const viaJobId = await deleteLogFile("../../..", "secret.log");
    expect(viaJobId.success).toBe(false);
    expect(existsSync(path.join(root, "secret.log"))).toBe(true);
  });

  it("does not list folders outside the logs dir", async () => {
    const { getJobLogs } = await import("@/app/_server/actions/logs");
    expect(await getJobLogs("../..", true)).toEqual([]);
  });
});

describe("backup files", () => {
  it("restores legit backups and ignores traversal", async () => {
    const { readBackupFile, deleteBackupFile } = await import("@/app/_utils/backup-utils");
    expect((await readBackupFile("abcd-1234.job"))?.command).toBe("echo hi");
    expect(await readBackupFile("../../../secret.job")).toBeNull();
    expect(await readBackupFile(secret)).toBeNull();
    expect(await readBackupFile("abcd-1234.json")).toBeNull();

    expect(await deleteBackupFile("../../../secret.job")).toBe(false);
    expect(existsSync(secret)).toBe(true);
  });
});

describe("script content", () => {
  it("reads scripts inside the scripts dir only", async () => {
    const { getScriptContent, executeScript } = await import("@/app/_server/actions/scripts");
    expect(await getScriptContent("hello.sh")).toBe("echo hello");
    expect(await getScriptContent("../../secret.sh")).toBe("");
    expect(await getScriptContent(path.join(root, "secret.sh"))).toBe("");

    const run = await executeScript("../../secret.sh");
    expect(run).toMatchObject({ success: false, error: "Invalid script filename" });
  });
});
