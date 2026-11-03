import type { Product } from "@/types/domain";

export type CartItem = { productId: string; quantity: number };

/**
 * The cart lines the page actually shows. A stored line for a product that is no
 * longer listed is hidden from the cart, so it must not be sent for pricing either.
 */
export const listedLines = (items: CartItem[], products: Product[]): CartItem[] =>
  items.filter((item) => products.some((product) => product.id === item.productId));

export const STORAGE_KEY = "midnight-coffee-cart";

// Kept apart from the cart items so a stored cart written before coupons existed still parses.
export const COUPON_STORAGE_KEY = "midnight-coffee-coupon";

/** Blank or non-string stored values mean no coupon. */
export const parseStoredCoupon = (raw: string | null): string | null => {
  const code = raw?.trim() ?? "";
  return code === "" ? null : code;
};

/**
 * Parses persisted cart JSON, dropping anything that is not a usable line item.
 *
 * Silently returns [] for unreadable storage as well as empty storage, so a
 * corrupt cart is discarded with no signal to the caller or the user. Callers
 * cannot distinguish "nothing saved" from "saved but unreadable".
 * See docs/coverage-findings.md #11.
 */
export const parseStored = (raw: string | null): CartItem[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CartItem =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as CartItem).productId === "string" &&
        Number.isInteger((entry as CartItem).quantity) &&
        (entry as CartItem).quantity > 0
    );
  } catch {
    return [];
  }
};
