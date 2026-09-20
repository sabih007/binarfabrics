"use client";

import Link from "next/link";
import { type FormEvent } from "react";
import { useStore } from "./StoreProvider";
import { Logo } from "./Header";
import { ClockIcon, FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, TikTokIcon, WhatsAppFillIcon } from "./Icons";

export default function Footer() {
  const { showToast } = useStore();

  const onSubscribe = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Hook your newsletter provider (Mailchimp, Klaviyo…) here
    e.currentTarget.reset();
    showToast("Thanks for subscribing — welcome to BinAr!");
  };

  return (
    <>
      <section className="newsletter">
        <div className="container newsletter__inner">
          <div>
            <span className="eyebrow">Stay in the loop</span>
            <h2>Get first access to new collections</h2>
            <p>Sign up for launches, restocks and members-only discounts. No spam, ever.</p>
          </div>
          <form className="newsletter__form" onSubmit={onSubscribe}>
            <input type="email" placeholder="Your email address" required aria-label="Email" />
            <button className="btn" type="submit">Subscribe</button>
          </form>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer__grid">
            <div className="footer__brand">
              <Logo align="start" />
              <p>Premium unstitched fabrics and ready-to-wear from Pakistan — crafted for comfort, colour and everyday elegance.</p>
              <div className="social">
                <a href="#" aria-label="Instagram"><InstagramIcon /></a>
                <a href="#" aria-label="Facebook"><FacebookIcon /></a>
                <a href="#" aria-label="TikTok"><TikTokIcon /></a>
                <a href="#" aria-label="WhatsApp"><WhatsAppFillIcon /></a>
              </div>
            </div>
            <div>
              <h4>Shop</h4>
              <ul>
                <li><Link href="/shop?cat=women">Women</Link></li>
                <li><Link href="/shop?cat=men">Men</Link></li>
                <li><Link href="/shop?cat=kids">Kids</Link></li>
                <li><Link href="/shop?cat=home">Home Textiles</Link></li>
                <li><Link href="/shop?badge=new">New Arrivals</Link></li>
                <li><Link href="/shop?badge=sale">Sale</Link></li>
              </ul>
            </div>
            <div>
              <h4>Help</h4>
              <ul>
                <li><Link href="/contact">Contact Us</Link></li>
                <li><Link href="/contact#faq">Shipping &amp; Delivery</Link></li>
                <li><Link href="/contact#faq">Returns &amp; Exchange</Link></li>
                <li><Link href="/contact#faq">Track Your Order</Link></li>
                <li><Link href="/contact#faq">Size &amp; Fabric Guide</Link></li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><Link href="/about">About BinAr</Link></li>
                <li><Link href="/about#values">Our Craft</Link></li>
                <li><Link href="/contact">Wholesale Enquiries</Link></li>
                <li><Link href="/contact">Careers</Link></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4>Get in touch</h4>
              <ul className="footer__contact">
                <li><PinIcon /><span>Shop 12, Textile Market, Karachi, Pakistan</span></li>
                <li><PhoneIcon /><a href="tel:+923001234567">0300-1234567</a></li>
                <li><MailIcon /><a href="mailto:hello@binarfabrics.pk">hello@binarfabrics.pk</a></li>
                <li><ClockIcon /><span>Mon–Sat, 10am–7pm</span></li>
              </ul>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© {new Date().getFullYear()} BinAr Fabrics. All rights reserved.</span>
            <div className="payments"><span>COD</span><span>VISA</span><span>MASTERCARD</span><span>JAZZCASH</span><span>EASYPAISA</span></div>
          </div>
        </div>
      </footer>
    </>
  );
}
