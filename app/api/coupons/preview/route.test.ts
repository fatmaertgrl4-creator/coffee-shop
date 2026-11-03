import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createProduct } from "@/lib/store";
import { jsonHeaders, resetStore } from "@/tests/support/store";
import type { Product } from "@/types/domain";

const preview = (body: unknown) =>
  POST(
    new Request("http://test/api/coupons/preview", {
      method: "POST",
      headers: jsonHeaders,
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

const addProduct = (overrides: Partial<Product> = {}) =>
  createProduct({
    id: "test-latte",
    name: "Test Latte",
    description: "",
    price: 45000,
    category: "drink",
    imageUrl: "https://example.test/latte.jpg",
    available: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

const cart = [{ productId: "test-latte", quantity: 2 }];

beforeEach(() => {
  resetStore();
  addProduct();
});
afterEach(() => vi.useRealTimers());

describe("POST /api/coupons/preview: validation", () => {
  it("rejects malformed JSON", async () => {
    expect(await errorOf(await preview("{not json"))).toBe("Invalid JSON body");
  });

  it("rejects a non-object body", async () => {
    expect(await errorOf(await preview("null"))).toBe("Invalid request body");
  });

  it("rejects an empty cart", async () => {
    expect(await errorOf(await preview({ code: "YAZ10", items: [] }))).toBe("Cart is empty");
  });

  it("rejects an unknown product", async () => {
    const res = await preview({ code: "YAZ10", items: [{ productId: "nope", quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe("Unknown product: nope");
  });

  it("rejects an unavailable product", async () => {
    addProduct({ id: "sold-out", name: "Sold Out Mocha", available: false });
    const res = await preview({ code: "YAZ10", items: [{ productId: "sold-out", quantity: 1 }] });
    expect(await errorOf(res)).toBe("Sold Out Mocha is not available");
  });

  it.each([0, -1, 1.5])("rejects quantity %j", async (quantity) => {
    const res = await preview({ code: "YAZ10", items: [{ productId: "test-latte", quantity }] });
    expect(await errorOf(res)).toBe("Invalid quantity");
  });
});

describe("POST /api/coupons/preview: coupon checks", () => {
  it("rejects a code that does not exist", async () => {
    const res = await preview({ code: "NOPE", items: cart });
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toBe("Invalid coupon code");
  });

  it("rejects a blank code", async () => {
    expect(await errorOf(await preview({ code: "   ", items: cart }))).toBe("Invalid coupon code");
  });

  it("rejects a missing code", async () => {
    expect(await errorOf(await preview({ items: cart }))).toBe("Invalid coupon code");
  });

  it("rejects an expired coupon", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00.000Z"));
    const res = await preview({ code: "YAZ10", items: cart });
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toBe("Coupon has expired");
  });
});

describe("POST /api/coupons/preview: success", () => {
  it("returns the discount and the discounted total", async () => {
    // Subtotal 2 x 45 000 = 90 000; 10% = 9 000.
    const res = await preview({ code: "YAZ10", items: cart });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      code: "YAZ10",
      percent: 10,
      subtotal: 90000,
      discountAmount: 9000,
      total: 81000,
    });
  });

  it("matches the code regardless of case and surrounding spaces", async () => {
    const body = (await (await preview({ code: "  yaz10 ", items: cart })).json()) as { code: string };
    expect(body.code).toBe("YAZ10");
  });

  it("rounds the discount to the nearest cent", async () => {
    addProduct({ id: "odd-price", price: 3333 });
    // 10% of 3 333 = 333.3 -> 333; total 3 000.
    const body = (await (
      await preview({ code: "YAZ10", items: [{ productId: "odd-price", quantity: 1 }] })
    ).json()) as { discountAmount: number; total: number };
    expect(body.discountAmount).toBe(333);
    expect(body.total).toBe(3000);
  });
});
