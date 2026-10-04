import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/_utils/server-action-auth", () => ({
  requireActionAuth: vi.fn(async () => undefined),
}));
vi.mock("@/app/_server/actions/global", () => ({
  isDocker: vi.fn(async () => true),
  getHostScriptsPath: vi.fn(async () => "/srv/cronmaster/scripts"),
}));

const { buildScriptSelection } = await import(
  "@/app/_components/FeatureComponents/Cronjobs/Parts/ScriptCommandPicker"
);
const { getScriptPathForCron } = await import("@/app/_server/actions/scripts");
const { resolveJobCommand } = await import("@/app/_utils/script-command-utils");

const script = {
  id: "s1",
  name: "Backup",
  description: "",
  createdAt: "",
  filename: "backup.sh",
};

describe("script path preview in docker", () => {
  it("previews the host path that the server writes to the crontab", async () => {
    const preview = await buildScriptSelection(script);
    const saved = await resolveJobCommand({
      command: preview.command,
      selectedScriptId: preview.selectedScriptId,
      scripts: async () => [script],
      getScriptPath: getScriptPathForCron,
    });

    expect(preview.command).toBe("bash /srv/cronmaster/scripts/backup.sh");
    expect(saved).toEqual({ success: true, command: preview.command });
  });
});
