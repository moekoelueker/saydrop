import { describe, expect, it } from "vitest";
import { barScale, smoothLevel } from "./VoiceWaveIndicator";

describe("smoothLevel", () => {
  it("rises faster than it falls", () => {
    const rise = smoothLevel(0, 1, 30);
    const fall = 1 - smoothLevel(1, 0, 30);
    expect(rise).toBeGreaterThan(fall * 2);
  });

  it("does not move without elapsed time", () => {
    expect(smoothLevel(0.4, 1, 0)).toBe(0.4);
  });
});

describe("barScale", () => {
  it("keeps a minimum height when silent", () => {
    for (let i = 0; i < 16; i++) {
      expect(barScale(i, 0, 1234)).toBeCloseTo(0.12);
    }
  });

  it("is mirrored with the tallest bars in the middle", () => {
    for (let i = 0; i < 8; i++) {
      expect(barScale(i, 0.8, 500)).toBeCloseTo(barScale(15 - i, 0.8, 500));
    }
    expect(barScale(7, 0.8, 0)).toBeGreaterThan(barScale(0, 0.8, 0));
  });

  it("never exceeds full height", () => {
    for (let t = 0; t < 2000; t += 37) {
      expect(barScale(7, 1, t)).toBeLessThanOrEqual(1);
    }
  });
});
