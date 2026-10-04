/* ==========================================================================
   Environment access.
   Required vars throw loudly at first use; optional features (Stripe, email)
   degrade gracefully so the site still runs with only DATABASE_URL set.
   ========================================================================== */

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return v;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  /** Used to sign admin session cookies. Any long random string. */
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  },

  // ---- optional integrations -------------------------------------------
  stripeSecret: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  resendKey: process.env.RESEND_API_KEY || "",
  mailFrom: process.env.MAIL_FROM || "BinAr Fabrics <onboarding@resend.dev>",
  /** Where contact-form notifications are delivered. */
  mailTo: process.env.MAIL_TO || "",

  get stripeEnabled() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },
  get mailEnabled() {
    return Boolean(process.env.RESEND_API_KEY);
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};
