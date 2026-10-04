"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { catName, type FacetCount, type Facets, type Product, type ProductPage } from "@/lib/products";
import { apiGet } from "@/lib/client";
import { useStore } from "@/components/StoreProvider";
import ProductCard from "@/components/ProductCard";
import { CloseIcon } from "@/components/Icons";

type SortKey = "featured" | "popular" | "new" | "low" | "high";

/** UI sort -> the API's sort parameter. */
const SORT_PARAM: Record<SortKey, string> = {
  featured: "featured",
  popular: "rating",
  new: "new",
  low: "price-asc",
  high: "price-desc",
};

interface Filters {
  cat: string[];
  fabric: string[];
  collection: string[];
  price: string;
  sale: boolean;
  isNew: boolean;
  wish: boolean;
  sort: SortKey;
}

const PRICE_BANDS = [
  { value: "", label: "All prices" },
  { value: "0-3000", label: "Under PKR 3,000" },
  { value: "3000-6000", label: "PKR 3,000 – 6,000" },
  { value: "6000-10000", label: "PKR 6,000 – 10,000" },
  { value: "10000-999999", label: "Above PKR 10,000" },
];

const EMPTY_FACETS: Facets = { categories: [], fabrics: [], collections: [] };

/** The listing has no pager, so ask for the most a single page may hold. */
const PER_PAGE = 100;

function filtersFromParams(sp: URLSearchParams): Filters {
  return {
    cat: sp.get("cat") ? [sp.get("cat")!] : [],
    fabric: sp.get("fabric") ? [sp.get("fabric")!] : [],
    collection: sp.get("collection") ? [sp.get("collection")!] : [],
    price: "",
    sale: sp.get("badge") === "sale",
    isNew: sp.get("badge") === "new",
    wish: sp.get("wishlist") === "1",
    sort: (sp.get("sort") as SortKey) || "featured",
  };
}

function queryFor(f: Filters): string {
  const qs = new URLSearchParams();
  if (f.cat.length) qs.set("cat", f.cat.join(","));
  if (f.fabric.length) qs.set("fabric", f.fabric.join(","));
  if (f.collection.length) qs.set("collection", f.collection.join(","));
  if (f.sale) qs.set("badge", "sale");
  else if (f.isNew) qs.set("badge", "new");
  if (f.price) {
    const [lo, hi] = f.price.split("-");
    qs.set("min", lo);
    // Bands are half-open (3000-6000 excludes 6000) but the API's max is
    // inclusive, so step back one rupee.
    qs.set("max", String(Number(hi) - 1));
  }
  qs.set("sort", SORT_PARAM[f.sort]);
  qs.set("perPage", String(PER_PAGE));
  qs.set("facets", "1");
  return qs.toString();
}

/** Sorters for the wishlist view, which is filtered in the browser. */
const SORTERS: Partial<Record<SortKey, (a: Product, b: Product) => number>> = {
  popular: (a, b) => b.reviews - a.reviews,
  new: (a, b) => Number(b.badge === "new") - Number(a.badge === "new"),
  low: (a, b) => a.price - b.price,
  high: (a, b) => b.price - a.price,
};

export default function ShopClient() {
  const searchParams = useSearchParams();
  const { wishlist, catalogue, hydrated } = useStore();
  const [f, setF] = useState<Filters>(() => filtersFromParams(searchParams));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  // Responses can land out of order; only the newest request may paint.
  const latest = useRef(0);

  // Re-sync when the user navigates via header links (URL changes)
  useEffect(() => { setF(filtersFromParams(searchParams)); }, [searchParams]);

  const query = queryFor(f);

  useEffect(() => {
    // The wishlist lives in the browser, so that view is served from the store
    // rather than the API.
    if (f.wish) { setLoading(false); setError(null); return; }

    const id = ++latest.current;
    setLoading(true);

    const timer = setTimeout(() => {
      apiGet<ProductPage & { facets?: Facets }>(`/api/products?${query}`)
        .then((page) => {
          if (id !== latest.current) return;
          setProducts(page.products);
          if (page.facets) setFacets(page.facets);
          setError(null);
        })
        .catch((err: unknown) => {
          if (id !== latest.current) return;
          setError(err instanceof Error ? err.message : "Couldn't load products.");
          setProducts([]);
        })
        .finally(() => {
          if (id === latest.current) setLoading(false);
        });
    }, 120); // collapses rapid checkbox clicks into one request

    return () => clearTimeout(timer);
  }, [query, f.wish, retry]);

  // Facet lists come from the API; the wishlist view never fetches, so seed
  // them once from an unfiltered call.
  useEffect(() => {
    if (!f.wish || facets.fabrics.length > 0) return;
    let live = true;
    apiGet<ProductPage & { facets?: Facets }>(`/api/products?perPage=1&facets=1`)
      .then((page) => { if (live && page.facets) setFacets(page.facets); })
      .catch(() => {});
    return () => { live = false; };
  }, [f.wish, facets.fabrics.length]);

  const wished = useMemo(() => {
    const [lo, hi] = f.price ? f.price.split("-").map(Number) : [0, Infinity];
    const out = wishlist
      .map((id) => catalogue[id])
      .filter((p): p is Product => Boolean(p))
      .filter((p) =>
        (!f.cat.length || f.cat.includes(p.category)) &&
        (!f.fabric.length || f.fabric.includes(p.fabric)) &&
        (!f.collection.length || f.collection.includes(p.collection)) &&
        (!f.sale || p.badge === "sale") &&
        (!f.isNew || p.badge === "new") &&
        p.price >= lo && p.price < hi
      );
    const sorter = SORTERS[f.sort];
    return sorter ? [...out].sort(sorter) : out;
  }, [wishlist, catalogue, f]);

  const list = f.wish ? wished : products;
  // Wishlist products are fetched by the store, so "empty" is only true once
  // that has settled.
  const busy = f.wish ? !hydrated || wishlist.some((id) => !catalogue[id]) : loading;

  const heading = useMemo(() => {
    if (f.wish) return { title: "My Wishlist", crumb: "Wishlist", intro: "Products you've saved. Add them to your bag whenever you're ready." };
    if (f.sale) return { title: "Sale", crumb: "Sale", intro: "Selected fabrics at reduced prices — while stock lasts." };
    if (f.isNew) return { title: "New Arrivals", crumb: "New", intro: "The latest prints and weaves to land at BinAr." };
    if (f.collection.length === 1 && !f.cat.length) return { title: f.collection[0], crumb: f.collection[0], intro: "A curated collection from BinAr Fabrics." };
    if (f.cat.length === 1) {
      const name = facets.categories.find((c) => c.value === f.cat[0])?.label ?? catName(f.cat[0]);
      const t = name + (f.fabric.length === 1 ? " · " + f.fabric[0] : "");
      return { title: t, crumb: name, intro: defaultIntro };
    }
    if (f.fabric.length === 1) return { title: f.fabric[0], crumb: f.fabric[0], intro: defaultIntro };
    return { title: "All Products", crumb: "Shop", intro: defaultIntro };
  }, [f, facets.categories]);

  useEffect(() => { document.title = `${heading.title} — BinAr Fabrics`; }, [heading.title]);

  const toggleIn = useCallback((key: "cat" | "fabric" | "collection", value: string) =>
    setF((prev) => ({ ...prev, [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value] })), []);
  const clear = () => setF((prev) => ({ cat: [], fabric: [], collection: [], price: "", sale: false, isNew: false, wish: false, sort: prev.sort }));

  const CheckList = ({ keyName, data, selected }: { keyName: "cat" | "fabric" | "collection"; data: FacetCount[]; selected: string[] }) => (
    <div className="filters__list">
      {data.map((v) => (
        <label className="check" key={v.value}>
          <input type="checkbox" checked={selected.includes(v.value)} onChange={() => toggleIn(keyName, v.value)} />
          {v.label}<span className="count">{v.count}</span>
        </label>
      ))}
    </div>
  );

  return (
    <>
      <section className="page-head">
        <div className="container">
          <nav className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>{heading.crumb}</span></nav>
          <h1>{heading.title}</h1>
          <p>{heading.intro}</p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container shop">
          <aside className={`filters${drawerOpen ? " is-open" : ""}`}>
            <div className="filters__close"><span>Filters</span><button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close filters"><CloseIcon /></button></div>

            <details className="filters__group" open><summary>Category</summary><CheckList keyName="cat" data={facets.categories} selected={f.cat} /></details>
            <details className="filters__group" open><summary>Fabric</summary><CheckList keyName="fabric" data={facets.fabrics} selected={f.fabric} /></details>
            <details className="filters__group" open><summary>Collection</summary><CheckList keyName="collection" data={facets.collections} selected={f.collection} /></details>
            <details className="filters__group" open>
              <summary>Price</summary>
              <div className="filters__list">
                {PRICE_BANDS.map((b) => (
                  <label className="check" key={b.value}><input type="radio" name="price" value={b.value} checked={f.price === b.value} onChange={() => setF((p) => ({ ...p, price: b.value }))} /> {b.label}</label>
                ))}
              </div>
            </details>
            <details className="filters__group" open>
              <summary>Offers</summary>
              <div className="filters__list">
                <label className="check"><input type="checkbox" checked={f.sale} onChange={(e) => setF((p) => ({ ...p, sale: e.target.checked, isNew: e.target.checked ? false : p.isNew }))} /> On sale</label>
                <label className="check"><input type="checkbox" checked={f.isNew} onChange={(e) => setF((p) => ({ ...p, isNew: e.target.checked, sale: e.target.checked ? false : p.sale }))} /> New arrivals</label>
                <label className="check"><input type="checkbox" checked={f.wish} onChange={(e) => setF((p) => ({ ...p, wish: e.target.checked }))} /> My wishlist</label>
              </div>
            </details>
            <button className="filters__clear" onClick={clear}>Clear all filters</button>
          </aside>

          <div>
            <div className="shop__toolbar">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button className="btn btn--outline btn--sm filters-toggle" onClick={() => setDrawerOpen(true)}>Filters</button>
                <span className="shop__count">
                  {busy ? "Loading…" : `${list.length} product${list.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <label className="select">Sort by
                <select value={f.sort} onChange={(e) => setF((p) => ({ ...p, sort: e.target.value as SortKey }))}>
                  <option value="featured">Featured</option>
                  <option value="popular">Most popular</option>
                  <option value="new">Newest</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                </select>
              </label>
            </div>

            {error ? (
              <div className="shop__empty">
                {error}
                <br /><button className="btn btn--primary btn--sm" style={{ marginTop: 16 }} onClick={() => setRetry((n) => n + 1)}>Try again</button>
              </div>
            ) : list.length > 0 ? (
              <div className="product-grid" style={busy ? { opacity: 0.55, transition: "opacity .15s" } : undefined}>
                {list.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : busy ? (
              <div className="shop__empty">Loading products…</div>
            ) : (
              <div className="shop__empty">
                {f.wish ? "Your wishlist is empty — tap the heart on any product to save it." : "No products match these filters."}
                <br /><button className="btn btn--primary btn--sm" style={{ marginTop: 16 }} onClick={clear}>Clear filters</button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

const defaultIntro = "Premium unstitched fabrics and ready-to-wear. Use the filters to narrow down by category, fabric and price.";
