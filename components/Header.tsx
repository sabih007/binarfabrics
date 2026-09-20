"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PRODUCTS, byId, catName } from "@/lib/products";
import { useStore } from "./StoreProvider";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons";
import ProductCard from "./ProductCard";
import Swatch from "./Swatch";

const WOMEN_FABRICS = ["Lawn", "Cotton", "Linen", "Chiffon", "Silk", "Khaddar"];
const MEN_FABRICS: [string, string][] = [["Wash & Wear", "Wash & Wear"], ["Cotton", "Cotton"], ["Karandi", "Karandi"], ["Silk", "Boski & Silk"]];
const fabricHref = (cat: string, f: string) => `/shop?cat=${cat}&fabric=${encodeURIComponent(f)}`;

export function Logo({ align = "center" }: { align?: "center" | "start" }) {
  return (
    <Link className="logo" href="/" aria-label="BinAr Fabrics home" style={align === "start" ? { alignItems: "flex-start" } : undefined}>
      <span className="logo__name">Bin<span>Ar</span></span>
      <span className="logo__tag">Fabrics</span>
    </Link>
  );
}

export default function Header() {
  const store = useStore();
  const { totals, wishlist, hydrated } = store;

  return (
    <>
      <div className="announcement">
        Free delivery on orders above <strong>PKR 3,000</strong> &nbsp;·&nbsp; Cash on delivery nationwide &nbsp;·&nbsp; Easy 7-day exchange
      </div>
      <header className="header">
        <div className="container header__inner">
          <div className="header__left">
            <button className="icon-btn menu-toggle" onClick={store.openMobile} aria-label="Open menu"><MenuIcon /></button>
            <ul className="nav">
              <li>
                <Link className="nav__link" href="/shop?cat=women">Women</Link>
                <div className="mega">
                  <div>
                    <h4>Unstitched</h4>
                    <ul>{WOMEN_FABRICS.map((f) => <li key={f}><Link href={fabricHref("women", f)}>{f}</Link></li>)}</ul>
                  </div>
                  <div>
                    <h4>Collections</h4>
                    <ul>
                      <li><Link href="/shop?collection=Summer%20Lawn%20'26">Summer Lawn &apos;26</Link></li>
                      <li><Link href="/shop?collection=Festive%20Edit">Festive Edit</Link></li>
                      <li><Link href="/shop?collection=Winter%20Weaves">Winter Weaves</Link></li>
                      <li><Link href="/shop?badge=new">New Arrivals</Link></li>
                      <li><Link href="/shop?badge=sale">On Sale</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4>Shop by</h4>
                    <ul>
                      <li><Link href="/shop?cat=women&collection=Festive%20Edit">Eid &amp; Wedding</Link></li>
                      <li><Link href="/shop?cat=women&collection=Winter%20Weaves">Winter</Link></li>
                      <li><Link href="/shop?cat=women&sort=popular">Best Sellers</Link></li>
                      <li><Link href="/shop?cat=women">All Women</Link></li>
                    </ul>
                  </div>
                  <Link className="mega__promo" href="/shop?collection=Summer%20Lawn%20'26">
                    <Swatch pattern={byId("bl-102")!.pattern} colors={byId("bl-102")!.colors} />
                    <strong>Summer Lawn &apos;26</strong><span>Fresh prints, from PKR 2,990</span>
                  </Link>
                </div>
              </li>
              <li>
                <Link className="nav__link" href="/shop?cat=men">Men</Link>
                <div className="mega">
                  <div>
                    <h4>Fabric</h4>
                    <ul>{MEN_FABRICS.map(([f, label]) => <li key={f}><Link href={fabricHref("men", f)}>{label}</Link></li>)}</ul>
                  </div>
                  <div>
                    <h4>Occasion</h4>
                    <ul>
                      <li><Link href="/shop?cat=men&collection=Men's%20Essentials">Everyday</Link></li>
                      <li><Link href="/shop?cat=men&collection=Festive%20Edit">Eid &amp; Wedding</Link></li>
                      <li><Link href="/shop?cat=men&collection=Winter%20Weaves">Winter</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4>Popular</h4>
                    <ul>
                      <li><Link href="/shop?cat=men&sort=popular">Best Sellers</Link></li>
                      <li><Link href="/shop?cat=men&badge=new">New Arrivals</Link></li>
                      <li><Link href="/shop?cat=men&badge=sale">On Sale</Link></li>
                      <li><Link href="/shop?cat=men">All Men</Link></li>
                    </ul>
                  </div>
                  <Link className="mega__promo" href="/shop?cat=men">
                    <Swatch pattern={byId("bm-202")!.pattern} colors={byId("bm-202")!.colors} />
                    <strong>Men&apos;s Essentials</strong><span>Wash &amp; wear from PKR 3,490</span>
                  </Link>
                </div>
              </li>
              <li><Link className="nav__link" href="/shop?cat=kids">Kids</Link></li>
              <li><Link className="nav__link" href="/shop?cat=home">Home</Link></li>
              <li><Link className="nav__link nav__link--sale" href="/shop?badge=sale">Sale</Link></li>
            </ul>
          </div>

          <Logo />

          <div className="header__actions">
            <button className="icon-btn" onClick={store.openSearch} aria-label="Search"><SearchIcon /></button>
            <Link className="icon-btn" href="/contact" aria-label="Account"><UserIcon /></Link>
            <Link className="icon-btn" href="/shop?wishlist=1" aria-label="Wishlist">
              <HeartIcon />
              {hydrated && wishlist.length > 0 && <span className="icon-btn__count">{wishlist.length}</span>}
            </Link>
            <button className="icon-btn" onClick={store.openCart} aria-label="Open cart">
              <BagIcon />
              {hydrated && totals.count > 0 && <span className="icon-btn__count">{totals.count}</span>}
            </button>
          </div>
        </div>
      </header>

      <MobileNav />
      <SearchOverlay />
    </>
  );
}

function MobileNav() {
  const { mobileOpen, closeMobile } = useStore();
  const pathname = usePathname();
  useEffect(() => { closeMobile(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`mobile-nav${mobileOpen ? " is-open" : ""}`} aria-hidden={!mobileOpen}>
      <div className="mobile-nav__backdrop" onClick={closeMobile} />
      <nav className="mobile-nav__panel">
        <div className="mobile-nav__head">
          <span className="logo__name">Bin<span style={{ color: "var(--green)" }}>Ar</span></span>
          <button className="icon-btn" onClick={closeMobile} aria-label="Close menu"><CloseIcon /></button>
        </div>
        <ul className="mobile-nav__list" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) closeMobile(); }}>
          <li>
            <details>
              <summary>Women</summary>
              <div className="mobile-nav__sub">
                <Link href="/shop?cat=women">All Women</Link>
                {WOMEN_FABRICS.map((f) => <Link key={f} href={fabricHref("women", f)}>{f}</Link>)}
              </div>
            </details>
          </li>
          <li>
            <details>
              <summary>Men</summary>
              <div className="mobile-nav__sub">
                <Link href="/shop?cat=men">All Men</Link>
                {MEN_FABRICS.map(([f, label]) => <Link key={f} href={fabricHref("men", f)}>{label}</Link>)}
              </div>
            </details>
          </li>
          <li><Link href="/shop?cat=kids">Kids</Link></li>
          <li><Link href="/shop?cat=home">Home</Link></li>
          <li><Link href="/shop?badge=new">New Arrivals</Link></li>
          <li><Link href="/shop?badge=sale" style={{ color: "var(--sale)" }}>Sale</Link></li>
          <li><Link href="/about">About Us</Link></li>
          <li><Link href="/contact">Contact</Link></li>
        </ul>
        <div className="mobile-nav__foot"><span>Helpline: 0300-1234567</span><span>Mon–Sat, 10am–7pm</span></div>
      </nav>
    </div>
  );
}

const POPULAR = ["lawn", "chiffon", "men", "embroidered", "winter"];

function SearchOverlay() {
  const { searchOpen, closeSearch } = useStore();
  const [q, setQ] = useState("");
  const pathname = usePathname();
  useEffect(() => { closeSearch(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const term = q.trim().toLowerCase();
  const hits = term
    ? PRODUCTS.filter((p) => [p.name, p.fabric, p.category, catName(p.category), p.collection, p.description].join(" ").toLowerCase().includes(term))
    : [];

  return (
    <div className={`search${searchOpen ? " is-open" : ""}`} aria-hidden={!searchOpen}>
      <div className="search__inner">
        <div className="search__row">
          <SearchIcon />
          <input
            className="search__input"
            type="search"
            placeholder="Search lawn, chiffon, men's fabric…"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            ref={(el) => { if (searchOpen && el) setTimeout(() => el.focus(), 50); }}
          />
          <button className="icon-btn" onClick={closeSearch} aria-label="Close search"><CloseIcon /></button>
        </div>
        <div className="search__hint">
          Popular: {POPULAR.map((t) => <button key={t} onClick={() => setQ(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
        </div>
        {term && (hits.length
          ? <div className="search__results">{hits.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}</div>
          : <div className="search__empty">No results for “{term}”. Try “lawn”, “men” or “chiffon”.</div>)}
      </div>
    </div>
  );
}
