# BinAr Fabrics — Next.js Website

A clean, fast e-commerce site for BinAr Fabrics built with **Next.js (App Router) + TypeScript**.
Inspired by the layouts of leading Pakistani fashion brands: clear categories, big imagery,
PKR pricing, cash-on-delivery messaging, and a slide-out bag.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## Project structure

```
app/
  layout.tsx            Root layout: fonts, header, footer, cart drawer, toast
  page.tsx              Home
  shop/                 Catalogue with filters + sorting (reads ?cat= ?fabric= ?badge= …)
  product/[id]/         Product detail (statically generated for every product)
  about/                Brand story
  contact/              Contact form + FAQ
  globals.css           All styles (design tokens are CSS variables at the top)
components/
  StoreProvider.tsx     Cart, wishlist, drawers & toasts (persisted to localStorage)
  Header.tsx            Announcement bar, mega-menu nav, mobile drawer, search overlay
  Footer.tsx            Newsletter + footer
  CartDrawer.tsx        Slide-out bag with free-delivery progress; also exports <Toast/>
  ProductCard.tsx       Product tile (wishlist, quick add); also exports <Price/>
  Swatch.tsx            Product artwork: photo if `image` is set, else a generated fabric print
  Icons.tsx             Inline SVG icons
lib/
  products.ts           The product catalogue — edit products here
public/
  images/               Put product photos here
_old-static/            The original plain-HTML version (safe to delete)
```

## Editing products

All products live in `lib/products.ts`. Copy an entry and change the fields.
Prices are in PKR. `badge` can be `"new"`, `"sale"`, `"low"` or `null`.

## Adding real product photos

Product artwork is generated from each product's `pattern` and `colors` until you add photos:

1. Put the image in `public/images/` (e.g. `public/images/bl-101.jpg`).
2. Add `image: "/images/bl-101.jpg"` to that product in `lib/products.ts`.

That's it — the card, gallery, cart and homepage all switch to the photo automatically.

## Going live

* **Checkout** — "Proceed to checkout" is a placeholder. Add a Route Handler
  (`app/api/checkout/route.ts`) that talks to your payment gateway (JazzCash, Easypaisa,
  Stripe…) or hand the cart to Shopify / WooCommerce.
* **Contact form** — `app/contact/ContactForm.tsx` only shows a success message.
  Post it to `app/api/contact/route.ts` and send via Resend, Nodemailer, etc.
* **Newsletter** — same, in `components/Footer.tsx`.
* **Deploy** — push to GitHub and import on Vercel (zero config), or `npm run build && npm start` on any Node host.

## Brand tweaks

Colours, fonts and spacing are CSS variables at the top of `app/globals.css`.
Fonts are loaded with `next/font` in `app/layout.tsx`.
