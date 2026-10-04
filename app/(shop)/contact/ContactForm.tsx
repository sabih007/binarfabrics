"use client";

import { useState, type FormEvent } from "react";
import { useStore } from "@/components/StoreProvider";
import { ApiError, apiSend } from "@/lib/client";

export default function ContactForm() {
  const { showToast } = useStore();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});

    const form = new FormData(e.currentTarget);
    try {
      await apiSend("/api/contact", "POST", {
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        topic: String(form.get("topic") ?? ""),
        orderNumber: String(form.get("order") ?? ""),
        message: String(form.get("message") ?? ""),
        company: String(form.get("company") ?? ""),
      });
      setSent(true);
      showToast("Message sent — thank you!");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fields) setFields(err.fields);
      } else {
        setError("Couldn't send your message. Please try again.");
      }
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="form__success">
        Thanks — your message has been received. We&apos;ll get back to you within one working day.
      </div>
    );
  }

  const err = (key: string) =>
    fields[key] ? (
      <span style={{ color: "#b91c1c", fontSize: 12, marginTop: 4, display: "block" }}>{fields[key]}</span>
    ) : null;

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {error && (
        <div
          style={{
            background: "#fdf2f2",
            border: "1px solid #f5d5d5",
            color: "#991b1b",
            padding: "11px 14px",
            borderRadius: 9,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div className="form__row">
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" type="text" required placeholder="Your name" />
          {err("name")}
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" required placeholder="03XX-XXXXXXX" />
          {err("phone")}
        </div>
      </div>

      <div className="form__row">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" />
          {err("email")}
        </div>
        <div className="field">
          <label htmlFor="topic">Topic</label>
          <select id="topic" name="topic" defaultValue="Order status">
            <option>Order status</option>
            <option>Exchange / return</option>
            <option>Product question</option>
            <option>Wholesale enquiry</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="order">Order number (optional)</label>
        <input id="order" name="order" type="text" placeholder="e.g. BA-10234" />
        {err("orderNumber")}
      </div>

      <div className="field">
        <label htmlFor="msg">Message</label>
        <textarea id="msg" name="message" required placeholder="How can we help?" />
        {err("message")}
      </div>

      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
