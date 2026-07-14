import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./auth";

describe("signed operator sessions", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-with-at-least-thirty-two-characters";
  });

  it("round-trips a valid operator id", () => {
    const token = createSessionToken("operator-123");
    expect(verifySessionToken(token)).toBe("operator-123");
  });

  it("rejects tampered and malformed tokens", () => {
    const token = createSessionToken("operator-123");
    expect(verifySessionToken(`${token.slice(0, -1)}x`)).toBeNull();
    expect(verifySessionToken("not-a-token")).toBeNull();
  });
});
