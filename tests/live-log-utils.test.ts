import { describe, expect, it } from "vitest";
import {
  EMPTY_LIVE_LOG,
  applyLiveLogChunk,
  keepLastLines,
} from "@/app/_utils/live-log-utils";

const first = "tick 1\n";
const second = "tick 2\n";

describe("applyLiveLogChunk", () => {
  it("starts from the initial tail and then appends only new bytes", () => {
    const opened = applyLiveLogChunk(
      EMPTY_LIVE_LOG,
      0,
      { content: first, newContent: first, fileSize: first.length },
      500
    );
    expect(opened).toEqual({ content: first, offset: first.length });

    const next = applyLiveLogChunk(
      opened!,
      first.length,
      { newContent: second, fileSize: first.length + second.length },
      500
    );
    expect(next?.content).toBe(first + second);
  });

  it("drops a second response for the same offset instead of printing tick 1 twice", () => {
    const chunk = { content: first, newContent: first, fileSize: first.length };
    const opened = applyLiveLogChunk(EMPTY_LIVE_LOG, 0, chunk, 500)!;

    expect(applyLiveLogChunk(opened, 0, chunk, 500)).toBeNull();
    expect(opened.content.match(/tick 1/g)).toHaveLength(1);
  });

  it("drops a stale incremental response that arrives after a newer one", () => {
    const opened = { content: first, offset: first.length };
    const caughtUp = applyLiveLogChunk(
      opened,
      first.length,
      { newContent: second, fileSize: first.length + second.length },
      500
    )!;

    expect(
      applyLiveLogChunk(
        caughtUp,
        first.length,
        { newContent: second, fileSize: first.length + second.length },
        500
      )
    ).toBeNull();
    expect(caughtUp.content).toBe(first + second);
  });

  it("keeps waiting at offset zero until the log file exists", () => {
    expect(
      applyLiveLogChunk(EMPTY_LIVE_LOG, 0, { content: "" }, 500)
    ).toEqual(EMPTY_LIVE_LOG);
  });

  it("starts over when the file shrinks under it", () => {
    expect(
      applyLiveLogChunk({ content: "old", offset: 100 }, 100, { fileSize: 10 }, 500)
    ).toEqual(EMPTY_LIVE_LOG);
  });

  it("caps appended output to the visible line window", () => {
    const buffer = { content: "a\nb", offset: 3 };
    expect(
      applyLiveLogChunk(buffer, 3, { newContent: "\nc\nd", fileSize: 7 }, 2)
        ?.content
    ).toBe("c\nd");
  });
});

describe("keepLastLines", () => {
  it("leaves short content alone", () => {
    expect(keepLastLines("a\nb", 5)).toBe("a\nb");
  });
});
