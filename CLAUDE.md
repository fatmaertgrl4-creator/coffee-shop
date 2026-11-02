# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node.js 22+ is required (`engines` in package.json).

```bash
npm install
npm run dev              # Next.js dev server on :3000
npm run build
npm run lint             # eslint . (flat config, next/core-web-vitals + next/typescript)
npm test                 # vitest run (all *.test.ts)
npm run test:coverage    # coverage for lib/** and app/api/** only
npx vitest run lib/date.test.ts            # single file
npx vitest run -t "name of test"           # single test by name
```

## Architecture

**Demo app with no database.** All state lives in one process-global in-memory store, so it resets on server restart.

- `data/products.json` is the seed catalog. `lib/store.ts` copies it into `globalThis.__midnightCoffeeStore` (the global survives Next dev hot reloads). Runtime writes are never persisted back to the JSON.
- Products and orders are read and mutated only through the exported functions in `lib/store.ts`. Route handlers and pages should not touch the store object directly.
- Domain types (`Product`, `Order`, `OrderStatus`, ...) live in `types/domain.ts`.

**Checkout flow spans client and server:**
- The cart is a React Context (`components/cart-context.tsx`) persisted to `localStorage` under `midnight-coffee-cart`. Parsing and validation of the stored value is in `lib/cart-storage.ts`.
- The client sends only `productId` + `quantity`. `app/api/orders/route.ts` reprices items from the store, so client-side totals are display-only. It also validates the simulated card (any 16-digit number, future expiry, 3–4 digit CVC) and keeps only `last4`. Any change to pricing or validation belongs on the server side.

**Admin auth:** `app/api/admin/login` sets a fixed HttpOnly cookie (`midnight_admin`). `lib/session.ts` exports `isAdmin(request)`, which admin mutation routes use to gate access. The credential is hardcoded by design for this demo.

**Routing:** App Router under `app/`. Public pages: `/`, `/cart`, `/checkout`, `/confirmation`. Admin pages: `/admin/*`. JSON API: `app/api/{products,orders,admin}/...`, with dynamic segments as `[id]`.

**Shared helpers in `lib/`:** `api-error.ts` (error response shape for routes), `format.ts` (`formatPrice`), `date.ts`, `expiry.ts` (card expiry parsing and validation).

## Testing

- Tests are co-located next to the source as `*.test.ts`. Shared helpers are in `tests/support/` (`store.ts`).
- Test environment is `node`. Vitest is configured with the `@/` alias pointing to the repo root.
- Coverage is scoped to `lib/**/*.ts` and `app/api/**/*.ts`. **`components/**` and `app/checkout/**` are untested and not counted.** Don't assume a green coverage report means UI code is covered.

## Notes

- `tools/fast-glob-shim` replaces `fast-glob` via `package.json` `overrides` and `devDependencies`. It exists to avoid the `braces` advisory. Don't remove it unless the README's conditions are met.
- `postcss` is pinned via `overrides` to `^8.5.23`.
- Simplicity is intentional (see README "Demo philosophy"): prefer direct functions and the in-memory store over adding layers.
