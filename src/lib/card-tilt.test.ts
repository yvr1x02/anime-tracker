import { describe, expect, it } from "vitest";
import { cardTilt } from "./card-tilt";

const box = { left: 100, top: 50, width: 200, height: 300 };

describe("cardTilt", () => {
  it("is flat with the pointer at the centre", () => {
    const { rx, ry } = cardTilt(200, 200, box);
    expect(rx).toBeCloseTo(0);
    expect(ry).toBeCloseTo(0);
  });

  it("reaches 6 degrees at the edges, leaning towards the pointer", () => {
    expect(cardTilt(300, 200, box).ry).toBeCloseTo(6);
    expect(cardTilt(100, 200, box).ry).toBeCloseTo(-6);
    expect(cardTilt(200, 50, box).rx).toBeCloseTo(6);
    expect(cardTilt(200, 350, box).rx).toBeCloseTo(-6);
  });

  it("never goes past 6 degrees, even with the pointer outside the card", () => {
    expect(cardTilt(1000, -1000, box)).toEqual({ rx: 6, ry: 6 });
  });
});
