import type { Coupon } from "@/types/domain";

/** Customer-typed code -> the canonical form stored in data/coupons.json. */
export const normalizeCouponCode = (raw: string) => raw.trim().toUpperCase();

/** Percentage of a subtotal in cents, rounded to the nearest cent. */
export const calculateDiscount = (subtotal: number, percent: number) =>
  Math.round((subtotal * percent) / 100);

/** A coupon stops working at the instant of expiresAt, not after it. */
export const isCouponExpired = (coupon: Coupon, now: Date) =>
  now.getTime() >= Date.parse(coupon.expiresAt);
