import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS, byId, catName } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { ArrowIcon } from "@/components/Icons";
import ProductDetail from "./ProductDetail";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const p = byId(id);
  return p ? { title: p.name, description: p.description } : { title: "Product not found" };
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params;
  const p = byId(id);
  if (!p) notFound();

  // Related: same category first, then same fabric
  const score = (x: typeof p) => Number(x.category === p.category) + Number(x.fabric === p.fabric);
  const related = PRODUCTS.filter((x) => x.id !== p.id).sort((a, b) => score(b) - score(a)).slice(0, 4);

  return (
    <>
      <section className="section section--tight">
        <div className="container">
          <nav className="breadcrumbs" style={{ marginBottom: 28 }}>
            <Link href="/">Home</Link><span>/</span>
            <Link href={`/shop?cat=${p.category}`}>{catName(p.category)}</Link><span>/</span>
            <Link href={`/shop?fabric=${encodeURIComponent(p.fabric)}`}>{p.fabric}</Link><span>/</span>
            <span>{p.name}</span>
          </nav>
          <ProductDetail product={p} />
        </div>
      </section>

      <section className="section section--cream">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Complete the look</span><h2>You may also like</h2></div>
            <Link className="link-arrow" href={`/shop?cat=${p.category}`}>View more <ArrowIcon /></Link>
          </div>
          <div className="product-grid">{related.map((x) => <ProductCard key={x.id} product={x} />)}</div>
        </div>
      </section>
    </>
  );
}
