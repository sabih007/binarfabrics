"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/messages", label: "Messages" },
];

export default function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  // Badge the Messages tab. Failure is silent — a missing count is not worth
  // an error banner across the whole admin.
  useEffect(() => {
    let cancelled = false;
    apiGet<{ unread: number }>("/api/admin/messages?perPage=1")
      .then((d) => !cancelled && setUnread(d.unread))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiSend("/api/admin/logout", "POST");
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <header className="adm__bar">
      <Link className="adm__brand" href="/admin">
        BinAr<span>Admin</span>
      </Link>

      <nav className="adm__nav">
        {LINKS.map((link) => {
          // "/admin" would otherwise stay highlighted on every sub-page.
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}>
              {link.label}
              {link.label === "Messages" && unread > 0 && <span className="adm__count">{unread}</span>}
            </Link>
          );
        })}
      </nav>

      <span className="adm__who">{name}</span>
      <Link className="adm-btn adm-btn--sm" href="/" target="_blank" rel="noreferrer">
        View shop
      </Link>
      <button className="adm-btn adm-btn--sm" onClick={signOut} disabled={signingOut}>
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </header>
  );
}
