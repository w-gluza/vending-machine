import { describe, expect, it } from "vitest";
import { formatMoney } from "./formatMoney";

describe("formatMoney", () => {
  it.each([
    [0, "£0.00"],
    [5, "£0.05"],
    [99, "£0.99"],
    [100, "£1.00"],
    [101, "£1.01"],
    [120, "£1.20"],
    [200, "£2.00"],
    [1005, "£10.05"],
  ])("formats %i pence as %s", (pence, expected) => {
    expect(formatMoney(pence)).toBe(expected);
  });

  it.each([101.5, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2])(
    "rejects %s",
    (pence) => {
      expect(() => formatMoney(pence)).toThrow(RangeError);
    },
  );
});
