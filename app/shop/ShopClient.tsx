"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PRODUCTS, catName, type Product } from "@/lib/products";
import { useStore } from "@/components/StoreProvider";
import ProductCard from "@/components/ProductCard";
import { CloseIcon } from "@/components/Icons";

type SortKey = "featured" | "popular" | "new" | "low" | "high";

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

const SORTERS: Partial<Record<SortKey, (a: Product, b: Product) => number>> = {
  popular: (a, b) => b.reviews - a.reviews,
  new: (a, b) => Number(b.badge === "new") - Number(a.badge === "new"),
  low: (a, b) => a.price - b.price,
  high: (a, b) => b.price - a.price,
};

const countBy = (key: "category" | "fabric" | "collection") =>
  PRODUCTS.reduce<Record<string, number>>((m, p) => ((m[p[key]] = (m[p[key]] ?? 0) + 1), m), {});

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

export default function ShopClient() {
  const searchParams = useSearchParams();
  const { wishlist } = useStore();
  const [f, setF] = useState<Filters>(() => filtersFromParams(searchParams));
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Re-sync when the user navigates via header links (URL changes)
  useEffect(() => { setF(filtersFromParams(searchParams)); }, [searchParams]);

  const counts = useMemo(() => ({ category: countBy("category"), fabric: countBy("fabric"), collection: countBy("collection") }), []);

  const list = useMemo(() => {
    let out = PRODUCTS.filter((p) =>
      (!f.cat.length || f.cat.includes(p.category)) &&
      (!f.fabric.length || f.fabric.includes(p.fabric)) &&
      (!f.collection.length || f.collection.includes(p.collection)) &&
      (!f.sale || p.badge === "sale") &&
      (!f.isNew || p.badge === "new") &&
      (!f.wish || wishlist.includes(p.id))
    );
    if (f.price) { const [lo, hi] = f.price.split("-").map(Number); out = out.filter((p) => p.price >= lo && p.price < hi); }
    const sorter = SORTERS[f.sort];
    return sorter ? [...out].sort(sorter) : out;
  }, [f, wishlist]);

  const heading = useMemo(() => {
    if (f.wish) return { title: "My Wishlist", crumb: "Wishlist", intro: "Products you've saved. Add them to your bag whenever you're ready." };
    if (f.sale) return { title: "Sale", crumb: "Sale", intro: "Selected fabrics at reduced prices — while stock lasts." };
    if (f.isNew) return { title: "New Arrivals", crumb: "New", intro: "The latest prints and weaves to land at BinAr." };
    if (f.collection.length === 1 && !f.cat.length) return { title: f.collection[0], crumb: f.collection[0], intro: "A curated collection from BinAr Fabrics." };
    if (f.cat.length === 1) { const t = catName(f.cat[0]) + (f.fabric.length === 1 ? " · " + f.fabric[0] : ""); return { title: t, crumb: catName(f.cat[0]), intro: defaultIntro }; }
    if (f.fabric.length === 1) return { title: f.fabric[0], crumb: f.fabric[0], intro: defaultIntro };
    return { title: "All Products", crumb: "Shop", intro: defaultIntro };
  }, [f]);

  useEffect(() => { document.title = `${heading.title} — BinAr Fabrics`; }, [heading.title]);

  const toggleIn = (key: "cat" | "fabric" | "collection", value: string) =>
    setF((prev) => ({ ...prev, [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value] }));
  const clear = () => setF((prev) => ({ cat: [], fabric: [], collection: [], price: "", sale: false, isNew: false, wish: false, sort: prev.sort }));

  const CheckList = ({ keyName, data, selected, labelFn }: { keyName: "cat" | "fabric" | "collection"; data: Record<string, number>; selected: string[]; labelFn?: (v: string) => string }) => (
    <div className="filters__list">
      {Object.keys(data).map((v) => (
        <label className="check" key={v}>
          <input type="checkbox" checked={selected.includes(v)} onChange={() => toggleIn(keyName, v)} />
          {labelFn ? labelFn(v) : v}<span className="count">{data[v]}</span>
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

            <details className="filters__group" open><summary>Category</summary><CheckList keyName="cat" data={counts.category} selected={f.cat} labelFn={catName} /></details>
            <details className="filters__group" open><summary>Fabric</summary><CheckList keyName="fabric" data={counts.fabric} selected={f.fabric} /></details>
            <details className="filters__group" open><summary>Collection</summary><CheckList keyName="collection" data={counts.collection} selected={f.collection} /></details>
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
                <label className="check"><input type="checkbox" checked={f.sale} onChange={(e) => setF((p) => ({ ...p, sale: e.target.checked }))} /> On sale</label>
                <label className="check"><input type="checkbox" checked={f.isNew} onChange={(e) => setF((p) => ({ ...p, isNew: e.target.checked }))} /> New arrivals</label>
                <label className="check"><input type="checkbox" checked={f.wish} onChange={(e) => setF((p) => ({ ...p, wish: e.target.checked }))} /> My wishlist</label>
              </div>
            </details>
            <button className="filters__clear" onClick={clear}>Clear all filters</button>
          </aside>

          <div>
            <div className="shop__toolbar">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button className="btn btn--outline btn--sm filters-toggle" onClick={() => setDrawerOpen(true)}>Filters</button>
                <span className="shop__count">{list.length} product{list.length === 1 ? "" : "s"}</span>
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

            {list.length > 0 ? (
              <div className="product-grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
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
