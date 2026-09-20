import Link from "next/link";
import type { Metadata } from "next";
import { byId } from "@/lib/products";
import Swatch from "@/components/Swatch";

export const metadata: Metadata = {
  title: "About Us",
  description: "The story behind BinAr Fabrics — a Pakistani textile brand crafting premium unstitched fabrics with honest pricing.",
};

export default function AboutPage() {
  const story = byId("bl-104")!;
  const promo = byId("bm-201")!;

  return (
    <>
      <section className="page-head">
        <div className="container">
          <nav className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>About</span></nav>
          <h1>Our Story</h1>
          <p>From a single shop in Karachi&apos;s textile market to doorsteps across Pakistan.</p>
        </div>
      </section>

      <section className="section">
        <div className="container story">
          <div><Swatch pattern={story.pattern} colors={story.colors} label="Chikankari · Cotton" /></div>
          <div>
            <span className="eyebrow">Since 2015</span>
            <h2>Fabric that feels as good as it looks</h2>
            <p>BinAr Fabrics began with a simple idea: quality fabric shouldn&apos;t cost a fortune. We work directly with mills in Faisalabad and Karachi to bring you lawn, cotton, linen, chiffon and winter weaves at honest prices — no middlemen, no markups.</p>
            <p>Every print is designed in-house and every batch is checked for colour-fastness and weight before it reaches you. Whether you&apos;re dressing for Eid, a wedding or a Tuesday, we want you to feel comfortable and confident.</p>
            <p>Today we ship to every city in Pakistan, with cash on delivery and a no-fuss 7-day exchange.</p>
            <div style={{ marginTop: 28 }}><Link className="btn btn--primary" href="/shop">Shop the collection</Link></div>
          </div>
        </div>
      </section>

      <section className="section section--cream" id="values">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow">What we stand for</span><h2>Our Values</h2></div></div>
          <div className="values">
            <div className="value reveal"><div className="value__num">01</div><h3>Honest quality</h3><p>Mill-certified fabrics, full suit lengths and accurate colours. What you see is what you get.</p></div>
            <div className="value reveal"><div className="value__num">02</div><h3>Fair pricing</h3><p>By working directly with mills and selling online, we keep prices lower than comparable brands.</p></div>
            <div className="value reveal"><div className="value__num">03</div><h3>Made in Pakistan</h3><p>Designed, printed and packed locally — supporting craftspeople and mills at home.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container stats">
          <div className="stat reveal"><strong>10+</strong><span>Years in textiles</span></div>
          <div className="stat reveal"><strong>50k+</strong><span>Happy customers</span></div>
          <div className="stat reveal"><strong>150+</strong><span>Designs a year</span></div>
          <div className="stat reveal"><strong>4.8★</strong><span>Average rating</span></div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="promo promo--split reveal">
            <div className="promo__content">
              <span className="eyebrow">Wholesale &amp; bulk</span>
              <h2>Retailers, tailors &amp; boutiques</h2>
              <p>We supply bolts and bulk suit lengths to shops across Pakistan. Get in touch for trade pricing and a catalogue.</p>
              <div><Link className="btn btn--light" href="/contact">Enquire now</Link></div>
            </div>
            <div className="promo__visual"><Swatch pattern={promo.pattern} colors={promo.colors} /></div>
          </div>
        </div>
      </section>
    </>
  );
}
