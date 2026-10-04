import Link from "next/link";
import { FEATURED_COLLECTION, collectionHref } from "@/lib/products";
import { getHomeData } from "@/lib/queries";
import Swatch from "@/components/Swatch";
import ProductCard from "@/components/ProductCard";
import { ArrowIcon, CardIcon, RefreshIcon, StarIcon, TruckIcon } from "@/components/Icons";

export default async function HomePage() {
  const { hero, categories, newArrivals, bestSellers, lookbook, picks, fabrics } = await getHomeData();

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="hero">
        <div className="container hero__inner">
          <div>
            <span className="eyebrow">New Season · {FEATURED_COLLECTION}</span>
            <h1>Fabrics woven for <em>every day</em> and every celebration.</h1>
            <p className="hero__lead">Premium unstitched lawn, cotton, linen and chiffon for women, men and kids — delivered to your door anywhere in Pakistan.</p>
            <div className="hero__cta">
              <Link className="btn btn--primary" href="/shop?cat=women">Shop Women</Link>
              <Link className="btn btn--outline" href="/shop?cat=men">Shop Men</Link>
            </div>
            <div className="hero__meta">
              <div><strong>150+</strong><span>Designs</span></div>
              <div><strong>7-day</strong><span>Easy exchange</span></div>
              <div><strong>COD</strong><span>Nationwide</span></div>
            </div>
          </div>
          <div className="hero__visual">
            {hero.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`}><Swatch pattern={p.pattern} colors={p.colors} image={p.image} label={p.fabric} /></Link>
            ))}
            <div className="hero__badge"><span>Up to</span><strong>30%</strong><span>off sale</span></div>
          </div>
        </div>
      </section>

      {/* ===== Shop by category ===== */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Browse</span><h2>Shop by Category</h2></div>
            <Link className="link-arrow" href="/shop">View all products <ArrowIcon /></Link>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c.slug} className="cat-tile reveal" href={c.href}>
                <Swatch pattern={c.pattern} colors={c.colors} image={c.image} />
                <div className="cat-tile__body"><h3>{c.name}</h3><span>{c.sub}</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== New arrivals ===== */}
      <section className="section section--cream">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Just landed</span><h2>New Arrivals</h2><p>Fresh prints and weaves added this week. Hover a product to add it straight to your bag.</p></div>
            <Link className="link-arrow" href="/shop?badge=new">See all new <ArrowIcon /></Link>
          </div>
          <div className="product-grid">{newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      </section>

      {/* ===== Collection feature ===== */}
      {picks.collection && (
        <section className="section">
          <div className="container">
            <div className="promo promo--split reveal">
              <div className="promo__content">
                <span className="eyebrow">Featured Collection</span>
                <h2>{FEATURED_COLLECTION}</h2>
                <p>Light, airy lawn in hand-drawn florals and soft pastels. Three-piece unstitched suits with chiffon dupattas, starting from PKR 2,990.</p>
                <div><Link className="btn btn--light" href={collectionHref(FEATURED_COLLECTION)}>Explore the collection</Link></div>
              </div>
              <div className="promo__visual"><Swatch pattern={picks.collection.pattern} colors={picks.collection.colors} image={picks.collection.image} /></div>
            </div>
          </div>
        </section>
      )}

      {/* ===== Best sellers ===== */}
      <section className="section section--tight">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Customer favourites</span><h2>Best Sellers</h2></div>
            <Link className="link-arrow" href="/shop?sort=popular">Shop best sellers <ArrowIcon /></Link>
          </div>
          <div className="product-grid">{bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      </section>

      {/* ===== Men / Sale duo ===== */}
      {(picks.men || picks.sale) && (
        <section className="section section--tight">
          <div className="container promo-duo">
            {picks.men && (
              <Link className="promo-card reveal" href="/shop?cat=men">
                <Swatch pattern={picks.men.pattern} colors={picks.men.colors} image={picks.men.image} />
                <div className="promo-card__body">
                  <span className="eyebrow" style={{ color: "var(--gold)" }}>For Him</span>
                  <h3>Men&apos;s Unstitched</h3>
                  <p>Wash &amp; wear, cotton, karandi and boski — from PKR 3,490.</p>
                  <span className="link-arrow" style={{ color: "#fff" }}>Shop men <ArrowIcon /></span>
                </div>
              </Link>
            )}
            {picks.sale && (
              <Link className="promo-card reveal" href="/shop?badge=sale">
                <Swatch pattern={picks.sale.pattern} colors={picks.sale.colors} image={picks.sale.image} />
                <div className="promo-card__body">
                  <span className="eyebrow" style={{ color: "var(--gold)" }}>Limited time</span>
                  <h3>Sale — up to 30% off</h3>
                  <p>Selected lawn, chiffon and men&apos;s fabrics at reduced prices.</p>
                  <span className="link-arrow" style={{ color: "#fff" }}>Shop sale <ArrowIcon /></span>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ===== Shop by fabric ===== */}
      {fabrics.length > 0 && (
        <section className="section section--tight">
          <div className="container">
            <div className="section-head"><div><span className="eyebrow">Know your fabric</span><h2>Shop by Fabric</h2></div></div>
            <div className="chips">
              {fabrics.map((f) => (
                <Link key={f.name} className="chip" href={`/shop?fabric=${encodeURIComponent(f.name)}`}>
                  <span className="dot" style={{ background: f.color }} />{f.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Trust strip ===== */}
      <section className="section section--tight section--cream">
        <div className="container trust">
          <div className="trust__item reveal"><TruckIcon /><div><strong>Free nationwide delivery</strong><span>On all orders above PKR 3,000</span></div></div>
          <div className="trust__item reveal"><CardIcon /><div><strong>Cash on delivery</strong><span>Plus JazzCash, Easypaisa &amp; cards</span></div></div>
          <div className="trust__item reveal"><RefreshIcon /><div><strong>7-day easy exchange</strong><span>Hassle-free if it&apos;s not right</span></div></div>
          <div className="trust__item reveal"><StarIcon /><div><strong>Quality guaranteed</strong><span>Mill-certified, colour-fast fabrics</span></div></div>
        </div>
      </section>

      {/* ===== Reviews ===== */}
      <section className="section">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow">What customers say</span><h2>Loved across Pakistan</h2></div></div>
          <div className="reviews">
            <div className="review reveal"><div className="review__stars">★★★★★</div><p>“The lawn quality is honestly better than the big brands at this price. Colours didn&apos;t fade after washing.”</p><strong>Ayesha R.</strong><span>Lahore · Verified buyer</span></div>
            <div className="review reveal"><div className="review__stars">★★★★★</div><p>“Ordered wash &amp; wear for Eid — arrived in two days, fabric feels premium and the stitching came out great.”</p><strong>Hamza K.</strong><span>Karachi · Verified buyer</span></div>
            <div className="review reveal"><div className="review__stars">★★★★☆</div><p>“Easy to order, easy exchange. I swapped a colour and the replacement came within the week.”</p><strong>Sana M.</strong><span>Islamabad · Verified buyer</span></div>
          </div>
        </div>
      </section>

      {/* ===== Lookbook ===== */}
      {lookbook.length > 0 && (
        <section className="section section--tight">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">@binarfabrics</span><h2>Follow us on Instagram</h2></div>
              <a className="link-arrow" href="#">Follow <ArrowIcon /></a>
            </div>
            <div className="lookbook">
              {lookbook.map((p) => (
                <Link key={p.id} href={`/product/${p.id}`}><Swatch pattern={p.pattern} colors={p.colors} image={p.image} /></Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
