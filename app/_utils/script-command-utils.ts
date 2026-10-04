import type { Script } from "@/app/_utils/scripts-utils";
import { unwrapCommand } from "@/app/_utils/wrapper-utils-client";

type ScriptRef = Pick<Script, "id" | "filename">;

export type ResolvedJobCommand =
  | { success: true; command: string }
  | { success: false; message: string };

export const findScriptForCommand = <T extends ScriptRef>(
  command: string,
  scripts: T[]
): T | undefined => {
  const match = unwrapCommand(command.trim()).match(/^bash\s+(.+)$/);
  if (!match) return undefined;

  const scriptPath = match[1].trim().replace(/^(["'])(.*)\1$/, "$2");

  return scripts.find((script) => scriptPath.endsWith(`/${script.filename}`));
};

export const resolveJobCommand = async ({
  command,
  selectedScriptId,
  scripts,
  getScriptPath,
}: {
  command: string | null;
  selectedScriptId: string | null;
  scripts: () => Promise<ScriptRef[]>;
  getScriptPath: (filename: string) => Promise<string>;
}): Promise<ResolvedJobCommand> => {
  if (selectedScriptId) {
    const script = (await scripts()).find((s) => s.id === selectedScriptId);
    if (!script) {
      return { success: false, message: "Selected script not found" };
    }
    return { success: true, command: await getScriptPath(script.filename) };
  }

  if (!command?.trim()) {
    return {
      success: false,
      message: "Command or script selection is required",
    };
  }

  return { success: true, command };
};
