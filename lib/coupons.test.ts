import { describe, expect, it } from "vitest";
import seedCoupons from "@/data/coupons.json";
import { calculateDiscount, isCouponExpired, normalizeCouponCode } from "./coupons";

describe("seed coupons", () => {
  // Guards the static data: runtime code assumes these hold.
  it.each(seedCoupons)("$code has an uppercase code, a whole percent 1-100, and a parseable expiry", (coupon) => {
    expect(coupon.code).toBe(coupon.code.toUpperCase());
    expect(Number.isInteger(coupon.percent) && coupon.percent >= 1 && coupon.percent <= 100).toBe(true);
    expect(Number.isNaN(Date.parse(coupon.expiresAt))).toBe(false);
  });
});

describe("normalizeCouponCode", () => {
  it("trims surrounding whitespace and uppercases", () => {
    expect(normalizeCouponCode("  yaz10 ")).toBe("YAZ10");
  });

  it("leaves an already normal code unchanged", () => {
    expect(normalizeCouponCode("YAZ10")).toBe("YAZ10");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeCouponCode("   ")).toBe("");
  });
});

describe("calculateDiscount", () => {
  it("takes a percentage of the subtotal in cents", () => {
    // 10% of 45 000 kuruş
    expect(calculateDiscount(45000, 10)).toBe(4500);
  });

  it("rounds to the nearest cent", () => {
    // 15% of 3 333 = 499.95 -> 500
    expect(calculateDiscount(3333, 15)).toBe(500);
  });

  it("rounds half-cents up", () => {
    // 50% of 1 001 = 500.5 -> 501
    expect(calculateDiscount(1001, 50)).toBe(501);
  });

  it("returns 0 for a zero subtotal", () => {
    expect(calculateDiscount(0, 10)).toBe(0);
  });
});

describe("isCouponExpired", () => {
  const coupon = { code: "YAZ10", percent: 10, expiresAt: "2030-06-01T12:00:00.000Z" };

  it("is valid before the expiry instant", () => {
    expect(isCouponExpired(coupon, new Date("2030-06-01T11:59:59.999Z"))).toBe(false);
  });

  it("is expired at the exact expiry instant", () => {
    expect(isCouponExpired(coupon, new Date("2030-06-01T12:00:00.000Z"))).toBe(true);
  });

  it("is expired after the expiry instant", () => {
    expect(isCouponExpired(coupon, new Date("2030-06-02T00:00:00.000Z"))).toBe(true);
  });
});
