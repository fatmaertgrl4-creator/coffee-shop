"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useCart, type CartItem } from "@/components/cart-context";
import { formatPrice } from "@/lib/format";
import type { CouponPreview, Product } from "@/types/domain";

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

export function CartView({ products }: { products: Product[] }) {
  const { items, setQuantity, removeItem, coupon, setCoupon } = useCart();
  const [input, setInput] = useState("");
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Re-price the applied coupon whenever the cart changes. Only a coupon the
  // server rejects is dropped; a cart problem leaves the coupon in place.
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
        setCouponError(result.error);
        if (result.invalidCoupon) setCoupon(null);
      })
      .catch(() => {
        if (!cancelled) setCouponError(NETWORK_ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [coupon, items, setCoupon]);

  // The applied coupon changes only after the server accepts the typed code.
  const applyCoupon = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = input.trim();
    if (!code) return;
    setCouponError(null);
    requestPreview(code, items)
      .then((result) => {
        if (!result.ok) {
          setCouponError(result.error);
          return;
        }
        setCoupon(result.preview.code);
        setCouponPreview(result.preview);
        setInput("");
      })
      .catch(() => setCouponError(NETWORK_ERROR));
  };

  const rows = items
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((row): row is { item: CartItem; product: Product } => Boolean(row.product));

  const subtotal = rows.reduce((sum, row) => sum + row.product.price * row.item.quantity, 0);
  const appliedCoupon = coupon && couponPreview ? couponPreview : null;
  const total = appliedCoupon ? appliedCoupon.total : subtotal;

  if (rows.length === 0) {
    return (
      <main className="container">
        <section className="empty-state">
          <h1>Your cart is empty</h1>
          <p className="muted">Add something from the shop.</p>
          <Link href="/" className="button">Browse products</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container page">
      <h1>Your cart</h1>
      <div className="cart-layout">
        <ul className="cart-list">
          {rows.map(({ item, product }) => (
            <li key={product.id} className="cart-row">
              <Image src={product.imageUrl} alt={product.name} width={80} height={80} className="cart-thumb" />
              <div className="cart-info">
                <h2>{product.name}</h2>
                <span className="muted">{formatPrice(product.price)} each</span>
              </div>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQuantity(product.id, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => setQuantity(product.id, item.quantity + 1)} aria-label="Increase quantity">+</button>
              </div>
              <strong className="cart-line-total">{formatPrice(product.price * item.quantity)}</strong>
              <button type="button" className="remove-btn" onClick={() => removeItem(product.id)}>Remove</button>
            </li>
          ))}
        </ul>
        <aside className="cart-summary">
          <form className="coupon-form" onSubmit={applyCoupon}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Coupon code"
              aria-label="Coupon code"
            />
            <button type="submit" className="button-secondary">Apply</button>
          </form>
          {couponError && <p className="coupon-error" role="alert">{couponError}</p>}
          {appliedCoupon && (
            <div className="cart-discount">
              <span>Coupon {appliedCoupon.code} (−{appliedCoupon.percent}%)</span>
              <strong>−{formatPrice(appliedCoupon.discountAmount)}</strong>
              <button type="button" className="remove-btn" onClick={() => setCoupon(null)} aria-label="Remove coupon">
                Remove
              </button>
            </div>
          )}
          <div className="cart-total">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <Link href="/checkout" className="button button-block">Checkout</Link>
          <Link href="/" className="button-secondary button-block">Continue shopping</Link>
        </aside>
      </div>
    </main>
  );
}
