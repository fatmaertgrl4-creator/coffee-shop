"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCart, type CartItem } from "@/components/cart-context";
import { useCoupon } from "@/components/use-coupon";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/domain";

export function CartView({ products }: { products: Product[] }) {
  const { items, setQuantity, removeItem } = useCart();
  const [input, setInput] = useState("");

  const rows = items
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((row): row is { item: CartItem; product: Product } => Boolean(row.product));

  const { subtotal, applied, error, apply, remove } = useCoupon(products);
  const total = applied ? applied.total : subtotal;

  const submitCoupon = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = input.trim();
    if (!code) return;
    if (await apply(code)) setInput("");
  };

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
          <form className="coupon-form" onSubmit={submitCoupon}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Coupon code"
              aria-label="Coupon code"
            />
            <button type="submit" className="button-secondary">Apply</button>
          </form>
          {error && <p className="coupon-error" role="alert">{error}</p>}
          {applied && (
            <div className="cart-discount">
              <span>Coupon {applied.code} (−{applied.percent}%)</span>
              <strong>−{formatPrice(applied.discountAmount)}</strong>
              <button type="button" className="remove-btn" onClick={remove} aria-label="Remove coupon">
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
