import { NextResponse } from "next/server";
import { getCouponByCode, getProduct } from "@/lib/store";
import { calculateDiscount, isCouponExpired, normalizeCouponCode } from "@/lib/coupons";

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

// 422 marks a coupon the customer cannot use, so the client can drop it. Cart errors stay 400.
const invalidCoupon = (error: string) => NextResponse.json({ error }, { status: 422 });

/**
 * Prices the cart and applies a coupon without creating an order. The client
 * only displays the result; checkout will re-validate the coupon on the server.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (typeof body !== "object" || body === null) return badRequest("Invalid request body");

  const { code, items } = body as Record<string, unknown>;

  if (!Array.isArray(items) || items.length === 0) return badRequest("Cart is empty");

  let subtotal = 0;
  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) return badRequest("Invalid item");
    const entry = raw as Record<string, unknown>;
    const productId = typeof entry.productId === "string" ? entry.productId : "";
    const quantity = Number(entry.quantity);
    const product = getProduct(productId);
    if (!product) return badRequest(`Unknown product: ${productId}`);
    if (!product.available) return badRequest(`${product.name} is not available`);
    if (!Number.isInteger(quantity) || quantity < 1) return badRequest("Invalid quantity");
    subtotal += product.price * quantity;
  }

  const coupon = getCouponByCode(normalizeCouponCode(typeof code === "string" ? code : ""));
  if (!coupon) return invalidCoupon("Invalid coupon code");
  if (isCouponExpired(coupon, new Date())) return invalidCoupon("Coupon has expired");

  const discountAmount = calculateDiscount(subtotal, coupon.percent);

  return NextResponse.json({
    code: coupon.code,
    percent: coupon.percent,
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
  });
}
