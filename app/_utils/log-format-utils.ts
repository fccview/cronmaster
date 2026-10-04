export type LogTone =
  | "muted"
  | "accent"
  | "success"
  | "error"
  | "warning"
  | "info";

export interface LogSegment {
  text: string;
  tone?: LogTone;
  color?: string;
  bold?: boolean;
  dim?: boolean;
}

const ANSI_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const SGR_PATTERN = /\x1b\[([0-9;]*)m/g;
const SECTION_PATTERN = /^(-{2,}\s*)(\[\s*[^\]]+\s*\])(\s*-*)$/;
const FIELD_PATTERN =
  /^(Command|Timestamp|Host|User|Duration|Exit Code|Status)(\s*:\s?)(.*)$/;

const ANSI_COLORS: Record<number, string> = {
  30: "var(--surface2, var(--foreground2))",
  31: "var(--red)",
  32: "var(--green)",
  33: "var(--yellow)",
  34: "var(--blue)",
  35: "var(--pink)",
  36: "var(--teal)",
  37: "var(--subtext1, var(--foreground1))",
  90: "var(--overlay1, var(--foreground2))",
  91: "var(--maroon)",
  92: "var(--green)",
  93: "var(--peach)",
  94: "var(--sapphire)",
  95: "var(--mauve)",
  96: "var(--sky)",
  97: "var(--text, var(--foreground0))",
};

export const stripAnsi = (value: string): string =>
  value.replace(ANSI_PATTERN, "");

export const splitLogLines = (content: string): string[] => {
  if (!content) return [];
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
};

export const parseAnsi = (line: string): LogSegment[] => {
  const segments: LogSegment[] = [];
  let color: string | undefined;
  let bold = false;
  let dim = false;
  let cursor = 0;

  const push = (text: string) => {
    const clean = stripAnsi(text);
    if (!clean) return;
    const segment: LogSegment = { text: clean };
    if (color) segment.color = color;
    if (bold) segment.bold = true;
    if (dim) segment.dim = true;
    segments.push(segment);
  };

  for (const match of line.matchAll(SGR_PATTERN)) {
    push(line.slice(cursor, match.index));
    cursor = (match.index ?? 0) + match[0].length;

    const codes = match[1] === "" ? [0] : match[1].split(";").map(Number);
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (code === 0) {
        color = undefined;
        bold = false;
        dim = false;
      } else if (code === 1) {
        bold = true;
      } else if (code === 2) {
        dim = true;
      } else if (code === 22) {
        bold = false;
        dim = false;
      } else if (code === 39) {
        color = undefined;
      } else if (code === 38 || code === 48) {
        i += codes[i + 1] === 5 ? 2 : codes[i + 1] === 2 ? 4 : 0;
      } else if (ANSI_COLORS[code]) {
        color = ANSI_COLORS[code];
      }
    }
  }

  push(line.slice(cursor));
  return segments;
};

const statusTone = (value: string): LogTone | undefined => {
  const normalised = value.trim().toUpperCase();
  if (normalised === "SUCCESS") return "success";
  if (normalised === "FAILED" || normalised === "ERROR") return "error";
  return undefined;
};

export const isSectionLine = (line: string): boolean =>
  SECTION_PATTERN.test(stripAnsi(line));

export const formatLogLine = (line: string): LogSegment[] => {
  const plain = stripAnsi(line);

  const section = plain.match(SECTION_PATTERN);
  if (section) {
    return [
      { text: section[1], tone: "muted" },
      { text: section[2], tone: "accent", bold: true },
      { text: section[3], tone: "muted" },
    ];
  }

  const field = plain.match(FIELD_PATTERN);
  if (field) {
    const [, key, separator, value] = field;
    let tone: LogTone | undefined;
    if (key === "Status") tone = statusTone(value);
    if (key === "Exit Code") tone = value.trim() === "0" ? "success" : "error";
    return [
      { text: `${key}${separator}`, tone: "muted" },
      { text: value, tone, bold: Boolean(tone) },
    ];
  }

  return parseAnsi(line);
};
