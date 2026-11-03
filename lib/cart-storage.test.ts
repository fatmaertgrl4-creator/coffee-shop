import { describe, expect, it } from "vitest";
import { parseStored, parseStoredCoupon } from "@/lib/cart-storage";

describe("parseStoredCoupon", () => {
  it("returns null for absent or blank storage", () => {
    expect(parseStoredCoupon(null)).toBeNull();
    expect(parseStoredCoupon("")).toBeNull();
    expect(parseStoredCoupon("   ")).toBeNull();
  });

  it("returns the trimmed code", () => {
    expect(parseStoredCoupon("  YAZ10 ")).toBe("YAZ10");
  });
});

describe("parseStored", () => {
  it("returns an empty cart for absent storage", () => {
    expect(parseStored(null)).toEqual([]);
    expect(parseStored("")).toEqual([]);
  });

  it("returns an empty cart for unparseable or non-array JSON", () => {
    expect(parseStored("not json at all")).toEqual([]);
    expect(parseStored('{"productId":"espresso"}')).toEqual([]);
    expect(parseStored('"a string"')).toEqual([]);
    expect(parseStored("null")).toEqual([]);
  });

  it("keeps well-formed line items", () => {
    expect(parseStored('[{"productId":"espresso","quantity":2}]')).toEqual([
      { productId: "espresso", quantity: 2 },
    ]);
  });

  it("drops entries that are not usable line items", () => {
    const raw = JSON.stringify([
      { productId: "espresso", quantity: 2 },
      { productId: "cookie" },
      { quantity: 3 },
      { productId: 7, quantity: 1 },
      { productId: "cold-brew", quantity: 0 },
      { productId: "latte", quantity: -1 },
      { productId: "croissant", quantity: 2.5 },
      null,
      "not an object",
    ]);
    expect(parseStored(raw)).toEqual([{ productId: "espresso", quantity: 2 }]);
  });
});
