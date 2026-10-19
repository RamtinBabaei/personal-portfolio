import { describe, it, expect } from "vitest";
import { scrollDirection, scrollPace } from "@/lib/motion";

describe("scroll-responsive title motion", () => {
  it("stays at a readable base speed when idle and bounds violent wheel input", () => {
    expect(scrollPace(0)).toBe(1);
    expect(scrollPace(900)).toBeGreaterThan(1);
    expect(scrollPace(900)).toBeLessThan(2.5);
    expect(scrollPace(1_000_000)).toBe(2.5);
    expect(scrollPace(-1_000_000)).toBe(2.5);
  });
  it("uses the same pace for upward and downward motion", () => {
    expect(scrollPace(-950)).toBe(scrollPace(950));
  });
  it("reverses with meaningful input but retains direction through idle jitter", () => {
    expect(scrollDirection(-150, 1)).toBe(-1);
    expect(scrollDirection(150, -1)).toBe(1);
    expect(scrollDirection(0, -1)).toBe(-1);
    expect(scrollDirection(10, -1)).toBe(-1);
    expect(scrollDirection(-10, 1)).toBe(1);
  });
});
