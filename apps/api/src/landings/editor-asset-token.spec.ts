import { describe, expect, it } from "vitest";

import { createEditorAssetToken, verifyEditorAssetToken } from "./editor-asset-token";

describe("editor-asset-token", () => {
  it("creates and verifies a landing-scoped editor asset token", () => {
    const token = createEditorAssetToken({
      landingId: "landing-1",
      userId: "user-1"
    });

    expect(verifyEditorAssetToken(token)).toEqual(
      expect.objectContaining({
        landingId: "landing-1",
        sub: "user-1"
      })
    );
    expect(verifyEditorAssetToken(token)?.landingId).toBe("landing-1");
    expect(verifyEditorAssetToken("invalid.token")).toBeNull();
  });
});
