import { useEffect, useRef, useState } from "react";
import { useCart, type CartItem } from "@/components/cart-context";
import type { CouponPreview } from "@/types/domain";

const NETWORK_ERROR = "Could not check the coupon. Try again.";

type PreviewResult =
  | { ok: true; preview: CouponPreview }
  | { ok: false; error: string; invalidCoupon: boolean };

// The server answers 422 only when the coupon itself is unusable; other errors are cart problems.
const requestPreview = async (code: string, items: CartItem[]): Promise<PreviewResult> => {
  const res = await fetch("/api/coupons/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, items }),
  });
  const body = await res.json();
  if (res.ok) return { ok: true, preview: body as CouponPreview };
  return { ok: false, error: (body as { error: string }).error, invalidCoupon: res.status === 422 };
};

/**
 * The coupon applied to the cart, priced by the server. `applied` is null when no
 * usable coupon is set, or when the last preview was for a different subtotal
 * (the cart changed and the refetch has not returned yet). Callers pass the
 * current client subtotal so a stale discount is never shown or charged.
 */
export function useCoupon(subtotal: number) {
  const { items, coupon, setCoupon } = useCart();
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped by every apply and remove, so a slow apply cannot override a later action.
  const requestId = useRef(0);

  // Re-price whenever the cart changes. A coupon the server rejects is dropped;
  // a cart problem leaves it in place.
  useEffect(() => {
    if (!coupon) {
      setCouponPreview(null);
      return;
    }
    let cancelled = false;
    requestPreview(coupon, items)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setCouponPreview(result.preview);
          return;
        }
        setCouponPreview(null);
        setError(result.error);
        if (result.invalidCoupon) setCoupon(null);
      })
      .catch(() => {
        if (!cancelled) setError(NETWORK_ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [coupon, items, setCoupon]);

  // Resolves true when the server accepted the code and it is now applied.
  const apply = async (code: string): Promise<boolean> => {
    const id = ++requestId.current;
    setError(null);
    try {
      const result = await requestPreview(code, items);
      if (id !== requestId.current) return false;
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setCoupon(result.preview.code);
      setCouponPreview(result.preview);
      return true;
    } catch {
      if (id === requestId.current) setError(NETWORK_ERROR);
      return false;
    }
  };

  const isCurrent = couponPreview !== null && couponPreview.subtotal === subtotal;

  return {
    applied: coupon && isCurrent ? couponPreview : null,
    error,
    apply,
    remove: () => {
      requestId.current++;
      setError(null);
      setCoupon(null);
    },
  };
}
