import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getRelated } from "@/lib/queries";
import { catName } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { ArrowIcon } from "@/components/Icons";
import ProductDetail from "./ProductDetail";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  return p ? { title: p.name, description: p.description } : { title: "Product not found" };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const related = await getRelated(p);
  const categoryName = p.categoryName || catName(p.category);

  return (
    <>
      <section className="section section--tight">
        <div className="container">
          <nav className="breadcrumbs" style={{ marginBottom: 28 }}>
            <Link href="/">Home</Link><span>/</span>
            <Link href={`/shop?cat=${p.category}`}>{categoryName}</Link><span>/</span>
            <Link href={`/shop?fabric=${encodeURIComponent(p.fabric)}`}>{p.fabric}</Link><span>/</span>
            <span>{p.name}</span>
          </nav>
          <ProductDetail product={p} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="section section--cream">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">Complete the look</span><h2>You may also like</h2></div>
              <Link className="link-arrow" href={`/shop?cat=${p.category}`}>View more <ArrowIcon /></Link>
            </div>
            <div className="product-grid">{related.map((x) => <ProductCard key={x.id} product={x} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}
