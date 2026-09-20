import Link from "next/link";
import type { Metadata } from "next";
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/Icons";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with BinAr Fabrics — order help, exchanges, wholesale enquiries and FAQs.",
};

const FAQS: [string, string][] = [
  ["How long does delivery take?", "Orders are dispatched within 1–2 working days. Delivery takes 2–3 days in Karachi, Lahore and Islamabad, and 3–5 days elsewhere in Pakistan."],
  ["What are the delivery charges?", "Delivery is free on orders above PKR 3,000. Below that, a flat PKR 250 applies nationwide."],
  ["Do you offer cash on delivery?", "Yes — cash on delivery is available everywhere we ship. We also accept JazzCash, Easypaisa and debit/credit cards."],
  ["What is your exchange policy?", "Unstitched fabric can be exchanged within 7 days of delivery as long as it is uncut, unwashed and has its tags intact. Contact us on WhatsApp with your order number to start an exchange."],
  ["How much fabric is in a 3-piece suit?", "A standard 3-piece includes a 3 m shirt, 2.5 m dupatta and 2.5 m trouser. Men's suit lengths are 4.5 m. Exact measurements are listed on each product page."],
  ["Do you offer stitching?", "Not at the moment — all fabrics are sold unstitched unless marked \"Ready to Wear\". We're working on a stitching service; subscribe to our newsletter for updates."],
  ["Can I buy in bulk or for my shop?", "Yes. Choose \"Wholesale enquiry\" in the form above or email hello@binarfabrics.pk and we'll send trade pricing and our current catalogue."],
];

export default function ContactPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <nav className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Contact</span></nav>
          <h1>We&apos;re here to help</h1>
          <p>Questions about an order, a fabric, or a bulk enquiry? Reach us any way you like — we reply within one working day.</p>
        </div>
      </section>

      <section className="section">
        <div className="container contact">
          <div className="contact__info">
            <div className="contact__card reveal"><WhatsAppIcon /><div><strong>WhatsApp</strong><p>Fastest way to reach us</p><a href="https://wa.me/923001234567">0300-1234567</a></div></div>
            <div className="contact__card reveal"><PhoneIcon /><div><strong>Call us</strong><p>Mon–Sat, 10am–7pm</p><a href="tel:+923001234567">0300-1234567</a></div></div>
            <div className="contact__card reveal"><MailIcon /><div><strong>Email</strong><p>For orders &amp; wholesale</p><a href="mailto:hello@binarfabrics.pk">hello@binarfabrics.pk</a></div></div>
            <div className="contact__card reveal"><PinIcon /><div><strong>Visit our store</strong><p>Shop 12, Textile Market,<br />Karachi, Pakistan</p></div></div>
          </div>
          <ContactForm />
        </div>
      </section>

      <section className="section section--cream" id="faq">
        <div className="container faq">
          <div className="section-head" style={{ justifyContent: "center", textAlign: "center" }}>
            <div><span className="eyebrow">Good to know</span><h2>Frequently asked questions</h2></div>
          </div>
          <div className="accordion">
            {FAQS.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><div className="accordion__body">{a}</div></details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
