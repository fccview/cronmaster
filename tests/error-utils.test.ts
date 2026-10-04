import { describe, expect, it } from "vitest";
import { getErrorMessage, getErrorStack } from "@/app/_utils/error-utils";

describe("getErrorMessage", () => {
  it("reads the message of an Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("reads a string message from a plain object", () => {
    expect(getErrorMessage({ message: "nope" })).toBe("nope");
  });

  it("returns undefined for values without a string message", () => {
    expect(getErrorMessage("boom")).toBeUndefined();
    expect(getErrorMessage(null)).toBeUndefined();
    expect(getErrorMessage(undefined)).toBeUndefined();
    expect(getErrorMessage({ message: 42 })).toBeUndefined();
  });

  it("keeps the fallback pattern working for empty messages", () => {
    expect(getErrorMessage(new Error("")) || "fallback").toBe("fallback");
  });
});

describe("getErrorStack", () => {
  it("reads the stack of an Error", () => {
    const error = new Error("boom");
    expect(getErrorStack(error)).toBe(error.stack);
  });

  it("returns undefined when there is no stack", () => {
    expect(getErrorStack({ message: "x" })).toBeUndefined();
    expect(getErrorStack(7)).toBeUndefined();
  });
});
