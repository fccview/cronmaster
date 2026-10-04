import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { LOG_SCOPES } from "@/app/_utils/logger";

const ROOT = path.resolve(__dirname, "..");
const LOGGER_FILE = path.join("app", "_utils", "logger.ts");
const CONSOLE_CALL = /\bconsole\.(log|info|warn|error|debug|trace)\s*\(/;
const SCOPE_CALL = /createLogger\(\s*["']([^"']+)["']\s*\)/g;

const collectSources = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return collectSources(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });

const sources = [
  ...collectSources(path.join(ROOT, "app")),
  path.join(ROOT, "proxy.ts"),
  path.join(ROOT, "instrumentation.ts"),
];

const isCommentLine = (line: string) => {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*");
};

describe("logging guard", () => {
  it("never calls console directly outside the logger", () => {
    const offenders = sources
      .filter((file) => path.relative(ROOT, file) !== LOGGER_FILE)
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .map((line, index) => ({ line, index }))
          .filter(({ line }) => !isCommentLine(line) && CONSOLE_CALL.test(line))
          .map(({ index }) => `${path.relative(ROOT, file)}:${index + 1}`)
      );

    expect(offenders).toEqual([]);
  });

  it("only uses scopes rooted in the documented taxonomy", () => {
    const roots = new Set(LOG_SCOPES.map((scope) => scope.split(":")[0]));
    const unknown = sources.flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(SCOPE_CALL)]
        .map((match) => match[1])
        .filter((scope) => !roots.has(scope.split(":")[0]))
        .map((scope) => `${path.relative(ROOT, file)}: ${scope}`)
    );

    expect(unknown).toEqual([]);
  });
});
