const FRAME_KEYWORDS = new Set(["self", "none"]);

export const buildFrameAncestors = (value: string | undefined): string | null => {
  const sources = (value || "")
    .split(/[\s,]+/)
    .map((source) => source.trim())
    .filter(Boolean)
    .map((source) =>
      FRAME_KEYWORDS.has(source.toLowerCase()) ? `'${source.toLowerCase()}'` : source
    )
    .filter((source) => /^[^;'"\r\n]+$|^'(self|none)'$/.test(source));

  return sources.length > 0 ? `frame-ancestors ${sources.join(" ")}` : null;
};
