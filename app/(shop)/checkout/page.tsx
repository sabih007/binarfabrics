import Link from "next/link";
import type { Metadata } from "next";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your BinAr Fabrics order — cash on delivery nationwide, free delivery over PKR 3,000.",
  robots: { index: false, follow: false },
};

/** `?cancelled=1` is where Stripe returns a customer who backed out of paying. */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;

  return (
    <>
      <section className="page-head">
        <div className="container">
          <nav className="breadcrumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/shop">Shop</Link>
            <span>/</span>
            <span>Checkout</span>
          </nav>
          <h1>Checkout</h1>
          <p>Cash on delivery across Pakistan. Free delivery on orders over PKR 3,000.</p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <CheckoutForm cancelled={cancelled === "1"} />
        </div>
      </section>
    </>
  );
}
