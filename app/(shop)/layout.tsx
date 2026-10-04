import { StoreProvider } from "@/components/StoreProvider";
import Header, { type NavPromos } from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer, { Toast } from "@/components/CartDrawer";
import RevealObserver from "@/components/RevealObserver";
import { FEATURED_COLLECTION } from "@/lib/products";
import { pickProduct } from "@/lib/queries";

// The catalogue is live data, so storefront pages render per request rather
// than being baked at build time (which would also need a reachable database
// during `next build`).
export const dynamic = "force-dynamic";

const NO_PROMOS: NavPromos = { women: null, men: null };

/**
 * Artwork for the header's two mega-menu promos, taken from real stock.
 *
 * Decorative, and in the layout of every storefront page — so a database
 * problem here must not take down pages that don't otherwise need one. The
 * tiles simply don't render.
 */
async function navPromos(): Promise<NavPromos> {
  try {
    const [featured, men] = await Promise.all([
      pickProduct({
        category: { slug: "women" },
        collection: { equals: FEATURED_COLLECTION, mode: "insensitive" },
      }),
      pickProduct({ category: { slug: "men" } }),
    ]);

    return { women: featured ?? (await pickProduct({ category: { slug: "women" } })), men };
  } catch {
    return NO_PROMOS;
  }
}

/** Storefront chrome. Everything customer-facing renders inside this. */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const promos = await navPromos();

  return (
    <StoreProvider>
      <Header promos={promos} />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      <Toast />
      <RevealObserver />
    </StoreProvider>
  );
}
