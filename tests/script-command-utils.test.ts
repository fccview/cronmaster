import { describe, expect, it, vi } from "vitest";
import {
  findScriptForCommand,
  resolveJobCommand,
} from "@/app/_utils/script-command-utils";

const scripts = [
  { id: "a", filename: "backup.sh" },
  { id: "b", filename: "cleanup-logs.sh" },
];

describe("findScriptForCommand", () => {
  it("matches a plain bash invocation of a library script", () => {
    expect(
      findScriptForCommand("bash /opt/cronmaster/scripts/backup.sh", scripts)?.id
    ).toBe("a");
  });

  it("matches paths with spaces and quotes", () => {
    expect(
      findScriptForCommand("bash /Users/me/my apps/scripts/cleanup-logs.sh", scripts)?.id
    ).toBe("b");
    expect(
      findScriptForCommand(`bash "/srv/scripts/backup.sh"`, scripts)?.id
    ).toBe("a");
  });

  it("sees through the logging wrapper", () => {
    const wrapped = `/app/data/cron-log-wrapper.sh "job-1" sh -c 'bash /srv/scripts/backup.sh'`;
    expect(findScriptForCommand(wrapped, scripts)?.id).toBe("a");
  });

  it("ignores commands that only resemble a script call", () => {
    expect(findScriptForCommand("bash /srv/scripts/backup.sh --full", scripts)).toBeUndefined();
    expect(findScriptForCommand("bash /srv/scripts/not-backup.sh", scripts)).toBeUndefined();
    expect(findScriptForCommand("sh /srv/scripts/backup.sh", scripts)).toBeUndefined();
    expect(findScriptForCommand("echo backup.sh", scripts)).toBeUndefined();
    expect(findScriptForCommand("", scripts)).toBeUndefined();
  });
});

describe("resolveJobCommand", () => {
  const getScriptPath = vi.fn(async (filename: string) => `bash /host/scripts/${filename}`);

  it("resolves the selected script through the cron path resolver", async () => {
    const result = await resolveJobCommand({
      command: "whatever the client sent",
      selectedScriptId: "b",
      scripts: async () => scripts,
      getScriptPath,
    });
    expect(result).toEqual({ success: true, command: "bash /host/scripts/cleanup-logs.sh" });
    expect(getScriptPath).toHaveBeenCalledWith("cleanup-logs.sh");
  });

  it("fails when the selected script no longer exists", async () => {
    const result = await resolveJobCommand({
      command: "bash /x.sh",
      selectedScriptId: "gone",
      scripts: async () => scripts,
      getScriptPath,
    });
    expect(result).toEqual({ success: false, message: "Selected script not found" });
  });

  it("passes custom commands through untouched without loading scripts", async () => {
    const loadScripts = vi.fn(async () => scripts);
    const result = await resolveJobCommand({
      command: "echo hi && date",
      selectedScriptId: null,
      scripts: loadScripts,
      getScriptPath,
    });
    expect(result).toEqual({ success: true, command: "echo hi && date" });
    expect(loadScripts).not.toHaveBeenCalled();
  });

  it("requires a command when no script is selected", async () => {
    for (const command of [null, "", "   "]) {
      const result = await resolveJobCommand({
        command,
        selectedScriptId: null,
        scripts: async () => scripts,
        getScriptPath,
      });
      expect(result.success).toBe(false);
    }
  });
});
