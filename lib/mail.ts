/* ==========================================================================
   Transactional email via Resend's HTTP API (no SDK dependency).

   Every function here is best-effort: if RESEND_API_KEY is absent, or the
   send fails, we log and carry on. An email outage must never lose an order
   that is already safely in the database.
   ========================================================================== */

import { env } from "./env";
import { money } from "./products";

interface Mail {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

async function send(mail: Mail): Promise<boolean> {
  if (!env.mailEnabled) {
    console.info(`[mail] skipped (no RESEND_API_KEY): "${mail.subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.mailFrom,
        to: Array.isArray(mail.to) ? mail.to : [mail.to],
        subject: mail.subject,
        html: mail.html,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`[mail] send failed (${res.status}):`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail] transport error:", err);
    return false;
  }
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * The logo mark as a PNG on an absolute URL — mail clients won't render an
 * inline SVG, and many won't follow a relative path. If the image is blocked
 * (Gmail's default for a first-time sender) the wordmark below still carries
 * the brand, so nothing essential is lost.
 */
const logo = `${env.siteUrl}/brand/mark.png`;

const shell = (title: string, body: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#171614">
  <img src="${logo}" width="40" height="40" alt="" style="display:block;border:0;margin:0 0 12px" />
  <h1 style="font-size:20px;margin:0 0 4px">BinAr Fabrics</h1>
  <p style="color:#8a8580;margin:0 0 24px;font-size:13px">${esc(title)}</p>
  ${body}
  <hr style="border:0;border-top:1px solid #e8e3dc;margin:28px 0" />
  <p style="color:#8a8580;font-size:12px">BinAr Fabrics &middot; Premium unstitched fabrics from Pakistan</p>
</div>`;

export interface OrderMail {
  number: string;
  customerName: string;
  email?: string | null;
  phone: string;
  address: string;
  city: string;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: { name: string; qty: number; price: number }[];
}

function itemRows(items: OrderMail["items"]) {
  return items
    .map(
      (i) =>
        `<tr>` +
        `<td style="padding:8px 0;border-bottom:1px solid #f0ece5">${esc(i.name)} &times; ${i.qty}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #f0ece5;text-align:right;white-space:nowrap">${money(i.price * i.qty)}</td>` +
        `</tr>`
    )
    .join("");
}

function totalsRows(order: OrderMail) {
  return (
    `<tr><td style="padding:8px 0">Subtotal</td>` +
    `<td style="padding:8px 0;text-align:right">${money(order.subtotal)}</td></tr>` +
    `<tr><td style="padding:4px 0">Delivery</td>` +
    `<td style="padding:4px 0;text-align:right">${order.shipping ? money(order.shipping) : "Free"}</td></tr>` +
    `<tr><td style="padding:8px 0;font-weight:700;border-top:2px solid #171614">Total</td>` +
    `<td style="padding:8px 0;text-align:right;font-weight:700;border-top:2px solid #171614">${money(order.total)}</td></tr>`
  );
}

/** Receipt for the customer. No-op when they checked out without an email. */
export async function sendOrderConfirmation(order: OrderMail) {
  if (!order.email) return false;

  const firstName = esc(order.customerName.split(" ")[0] ?? order.customerName);
  const payLine =
    order.paymentMethod === "COD"
      ? "Payment: <strong>Cash on delivery</strong> &mdash; please keep the exact amount ready."
      : "Payment: <strong>Card</strong> &mdash; received, thank you.";

  const body = `
    <p>Thank you, ${firstName} &mdash; we have your order.</p>
    <p style="font-size:18px;margin:16px 0"><strong>Order ${esc(order.number)}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${itemRows(order.items)}
      ${totalsRows(order)}
    </table>
    <p style="margin-top:20px;font-size:14px">
      <strong>Delivering to</strong><br />${esc(order.address)}, ${esc(order.city)}<br />${esc(order.phone)}
    </p>
    <p style="font-size:14px">${payLine}</p>
    <p style="font-size:14px">We will confirm by phone before dispatch. Delivery usually takes 2&ndash;4 working days.</p>`;

  return send({
    to: order.email,
    subject: `Order ${order.number} confirmed - BinAr Fabrics`,
    html: shell("Order confirmation", body),
  });
}

/** Internal notification so the shop sees new orders without polling admin. */
export async function sendOrderNotification(order: OrderMail) {
  if (!env.mailTo) return false;

  const contact =
    `${esc(order.customerName)} &middot; ${esc(order.phone)}` +
    (order.email ? ` &middot; ${esc(order.email)}` : "");

  const body = `
    <p><strong>New ${esc(order.paymentMethod)} order &mdash; ${esc(order.number)}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${itemRows(order.items)}
      ${totalsRows(order)}
    </table>
    <p style="font-size:14px">${contact}<br />${esc(order.address)}, ${esc(order.city)}</p>
    <p><a href="${env.siteUrl}/admin/orders">Open in admin</a></p>`;

  return send({
    to: env.mailTo,
    subject: `New order ${order.number} - ${money(order.total)}`,
    html: shell("New order", body),
    replyTo: order.email ?? undefined,
  });
}

export async function sendContactNotification(msg: {
  name: string;
  phone: string;
  email?: string | null;
  topic: string;
  orderNumber?: string | null;
  message: string;
}) {
  if (!env.mailTo) return false;

  const heading =
    `<strong>${esc(msg.topic)}</strong>` +
    (msg.orderNumber ? ` &middot; order ${esc(msg.orderNumber)}` : "");
  const contact = `${esc(msg.name)} &middot; ${esc(msg.phone)}` + (msg.email ? ` &middot; ${esc(msg.email)}` : "");

  const body = `
    <p>${heading}</p>
    <p style="font-size:14px;white-space:pre-wrap;background:#f7f3ec;padding:14px;border-radius:8px">${esc(msg.message)}</p>
    <p style="font-size:14px">${contact}</p>`;

  return send({
    to: env.mailTo,
    subject: `Contact form: ${msg.topic} - ${msg.name}`,
    html: shell("Contact form", body),
    replyTo: msg.email ?? undefined,
  });
}
