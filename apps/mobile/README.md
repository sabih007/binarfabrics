# BinAr Fabrics — mobile app

The iOS and Android storefront for BinAr Fabrics, built with Expo (SDK 57) and
Expo Router.

## It shares the website's database

There is **one** catalogue, one order book and one subscriber list. The app does
not have a database of its own and does not connect to Postgres: it calls the
same `/api/*` routes the website serves, and those routes are the only thing
holding database, Stripe and mail credentials.

```
                    ┌──────────────────────┐
   this app ───────▶│  Next.js  /api/*     │
   the website ────▶│  (Prisma)            │──▶  Postgres
                    └──────────────────────┘
```

So an order placed in the app is an ordinary row in the `Order` table: stock is
reserved, the confirmation email goes out, and it shows up in `/admin` next to
every other order. Edit a product in the admin and the app sees it on next load.

Product and category shapes are imported straight from the website's
`lib/types.ts` through the `@shared/*` alias in `tsconfig.json` — type-only
imports, so nothing crosses the bundle, but the two cannot drift apart.

### Endpoints used

| Screen             | Call                                             |
| ------------------ | ------------------------------------------------ |
| Home               | `GET /api/categories?home=1`, `GET /api/products` |
| Shop               | `GET /api/products` (filters, paging, facets)    |
| Product            | `GET /api/products/:slug`                        |
| Bag                | `POST /api/orders` (re-prices the bag)           |
| Checkout           | `POST /api/checkout`                             |
| Order / tracking   | `GET /api/orders/:number?phone=…`                |
| Newsletter         | `POST /api/newsletter`                           |
| Feature detection  | `GET /api/config`                                |

Money is never sent from the app. The server re-prices every cart from the
database, and the totals on screen come from its answer.

## Running it

```bash
# 1. the store API — from the repository root
npm run dev

# 2. the app — from this folder
npm install          # first time only
npm start            # then press i, a, or w
```

Point the app at the API by editing `.env` (copied from `.env.example`):

| Running on            | `EXPO_PUBLIC_API_URL`                |
| --------------------- | ------------------------------------ |
| iOS simulator, web    | `http://localhost:3000`              |
| Android emulator      | `http://10.0.2.2:3000`               |
| A real phone on Wi-Fi | `http://<your computer's IP>:3000`   |
| Production            | `https://your-live-site.com`         |

A physical device cannot reach `localhost` — that address points at the phone
itself. Restart the dev server after changing `.env`; the values are inlined at
build time.

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint
npm run doctor       # expo-doctor
```

## Notes

- **Card payments** appear at checkout only when the website has
  `STRIPE_SECRET_KEY` set; `GET /api/config` is what tells the app. Paying opens
  Stripe Checkout in a browser session, and the Stripe webhook — not the app —
  marks the order paid, so the receipt screen re-reads the order afterwards and
  waits briefly for the webhook rather than guessing.
- **Order tracking** needs the order number *and* the phone number on the order;
  that phone number is what stands in for a login, exactly as on the website.
- **Theme** is a single light palette on both platforms, mirroring the brand
  tokens in the website's `app/globals.css`. Fabric colour has to read true, so
  there is deliberately no dark variant.
- **Products without a photo** get a generated print drawn from the row's
  `pattern` + `colors` hints, the same fallback as `components/Swatch.tsx` on the
  web.
- `ios/` and `android/` are generated (Continuous Native Generation) — configure
  native behaviour in `app.json`, never by hand.
