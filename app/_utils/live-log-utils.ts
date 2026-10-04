export interface LiveLogBuffer {
  content: string;
  offset: number;
}

export interface LiveLogChunk {
  content?: string;
  newContent?: string;
  fileSize?: number;
}

export const EMPTY_LIVE_LOG: LiveLogBuffer = { content: "", offset: 0 };

export const keepLastLines = (content: string, maxLines: number): string => {
  const lines = content.split("\n");
  return lines.length > maxLines ? lines.slice(-maxLines).join("\n") : content;
};

export const applyLiveLogChunk = (
  buffer: LiveLogBuffer,
  requestOffset: number,
  chunk: LiveLogChunk,
  maxLines: number
): LiveLogBuffer | null => {
  if (requestOffset !== buffer.offset) {
    return null;
  }

  if (chunk.fileSize === undefined) {
    return buffer;
  }

  if (requestOffset === 0) {
    return { content: chunk.content ?? "", offset: chunk.fileSize };
  }

  if (chunk.fileSize < requestOffset) {
    return EMPTY_LIVE_LOG;
  }

  return {
    content: chunk.newContent
      ? keepLastLines(buffer.content + chunk.newContent, maxLines)
      : buffer.content,
    offset: chunk.fileSize,
  };
};
