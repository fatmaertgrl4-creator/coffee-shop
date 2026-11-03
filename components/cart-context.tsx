"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  COUPON_STORAGE_KEY,
  STORAGE_KEY,
  parseStored,
  parseStoredCoupon,
  type CartItem,
} from "@/lib/cart-storage";

export type { CartItem };

type CartContextValue = {
  items: CartItem[];
  count: number;
  coupon: string | null;
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(parseStored(localStorage.getItem(STORAGE_KEY)));
    setCoupon(parseStoredCoupon(localStorage.getItem(COUPON_STORAGE_KEY)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (coupon) localStorage.setItem(COUPON_STORAGE_KEY, coupon);
    else localStorage.removeItem(COUPON_STORAGE_KEY);
  }, [items, coupon, loaded]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, item) => n + item.quantity, 0),
      coupon,
      setCoupon,
      addItem: (productId) =>
        setItems((prev) => {
          const existing = prev.find((item) => item.productId === productId);
          if (existing) {
            return prev.map((item) =>
              item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
            );
          }
          return [...prev, { productId, quantity: 1 }];
        }),
      removeItem: (productId) => setItems((prev) => prev.filter((item) => item.productId !== productId)),
      setQuantity: (productId, quantity) =>
        setItems((prev) => {
          if (quantity <= 0) return prev.filter((item) => item.productId !== productId);
          return prev.map((item) => (item.productId === productId ? { ...item, quantity } : item));
        }),
      clear: () => {
        setItems([]);
        setCoupon(null);
      },
    }),
    [items, coupon]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
