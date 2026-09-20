"use client";

import { useState, type FormEvent } from "react";
import { useStore } from "@/components/StoreProvider";

export default function ContactForm() {
  const { showToast } = useStore();
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Hook your email service / backend here (e.g. a Route Handler at /api/contact, Formspree, Resend…)
    setSent(true);
    showToast("Message sent — thank you!");
  };

  if (sent) {
    return <div className="form__success">Thanks — your message has been received. We&apos;ll get back to you within one working day.</div>;
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="form__row">
        <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" type="text" required placeholder="Your name" /></div>
        <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" required placeholder="03XX-XXXXXXX" /></div>
      </div>
      <div className="form__row">
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" placeholder="you@example.com" /></div>
        <div className="field">
          <label htmlFor="topic">Topic</label>
          <select id="topic" name="topic" defaultValue="Order status">
            <option>Order status</option><option>Exchange / return</option><option>Product question</option><option>Wholesale enquiry</option><option>Other</option>
          </select>
        </div>
      </div>
      <div className="field"><label htmlFor="order">Order number (optional)</label><input id="order" name="order" type="text" placeholder="e.g. BA-10234" /></div>
      <div className="field"><label htmlFor="msg">Message</label><textarea id="msg" name="message" required placeholder="How can we help?" /></div>
      <div><button className="btn btn--primary" type="submit">Send message</button></div>
    </form>
  );
}
