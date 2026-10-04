"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiSend } from "@/lib/client";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const form = new FormData(e.currentTarget);
    try {
      await apiSend("/api/admin/login", "POST", {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });

      // Only allow same-site redirects — ?next=https://evil.example would
      // otherwise turn the login page into an open redirect.
      const next = params.get("next");
      const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

      router.replace(dest);
      // The layout reads the session server-side, so it must re-render.
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      {error && <div className="adm-note adm-note--error">{error}</div>}

      <div className="adm-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" autoFocus />
      </div>

      <div className="adm-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>

      <button className="adm-btn adm-btn--primary" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
