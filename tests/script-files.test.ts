import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_utils/server-action-auth", () => ({
  requireActionAuth: vi.fn(async () => undefined),
}));
vi.mock("@/app/_server/actions/global", () => ({
  isDocker: vi.fn(async () => false),
  getHostScriptsPath: vi.fn(async () => null),
}));
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    exec: vi.fn((_command: string, ...rest: unknown[]) => {
      const callback = rest.find((arg) => typeof arg === "function") as
        | ((error: Error | null, result: { stdout: string; stderr: string }) => void)
        | undefined;
      callback?.(null, { stdout: "", stderr: "" });
    }),
  };
});

let root: string;

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "cronmaster-scripts-"));
});

beforeEach(() => {
  vi.spyOn(process, "cwd").mockReturnValue(root);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.append(key, value));
  return data;
};

describe("script files", () => {
  it("writes the same metadata header on create, update and clone", async () => {
    const { createScript, updateScript, cloneScript, getScriptContent } =
      await import("@/app/_server/actions/scripts");

    const created = await createScript(
      form({ name: "Nightly\nBackup", description: "keeps\r\nstuff", content: "echo one\r\necho two\r" })
    );
    expect(created.success).toBe(true);
    const id = created.script!.id;
    expect(id).toMatch(/^script_\d+_[a-z0-9]{1,9}$/);

    const file = path.join(root, "scripts", created.script!.filename);
    expect(await readFile(file, "utf8")).toBe(
      `# @id: ${id}\n# @title: Nightly Backup\n# @description: keeps stuff\n\necho one\necho two\n`
    );

    await updateScript(
      form({ id, name: "Nightly", description: "", content: "echo three" })
    );
    expect(await readFile(file, "utf8")).toBe(
      `# @id: ${id}\n# @title: Nightly\n# @description: \n\necho three`
    );

    const cloned = await cloneScript(id, "Copy");
    expect(cloned.success).toBe(true);
    const clone = path.join(root, "scripts", cloned.script!.filename);
    expect(await readFile(clone, "utf8")).toBe(
      `# @id: ${cloned.script!.id}\n# @title: Copy\n# @description: \n\necho three`
    );
    expect(await getScriptContent(cloned.script!.filename)).toBe("echo three");
  });
});
