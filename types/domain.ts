export type ProductCategory = "drink" | "food";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  imageUrl: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type Coupon = {
  code: string;
  percent: number;
  expiresAt: string;
};

export type CouponPreview = {
  code: string;
  percent: number;
  subtotal: number;
  discountAmount: number;
  total: number;
};

export type OrderItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type Order = {
  id: string;
  customer: Customer;
  items: OrderItem[];
  couponCode: string | null;
  discountAmount: number;
  total: number;
  payment: { method: "card"; last4: string };
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};
