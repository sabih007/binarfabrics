"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import BrandMark from "@/components/BrandMark";
import {
  BoxIcon,
  CloseIcon,
  GridIcon,
  InboxIcon,
  LogoutIcon,
  MenuIcon,
  ReceiptIcon,
  ShirtIcon,
  ShopIcon,
  TagIcon,
  TillIcon,
} from "./NavIcons";

/**
 * Grouped so the two things a shop does every day — serve the counter, serve
 * the website — don't sit in one undifferentiated list with settings.
 */
const GROUPS: { label: string; links: { href: string; label: string; Icon: typeof GridIcon }[] }[] = [
  {
    label: "Overview",
    links: [{ href: "/admin", label: "Dashboard", Icon: GridIcon }],
  },
  {
    label: "Counter",
    links: [
      { href: "/admin/pos", label: "Point of sale", Icon: TillIcon },
      { href: "/admin/sales", label: "Counter sales", Icon: ReceiptIcon },
    ],
  },
  {
    label: "Online",
    links: [
      { href: "/admin/orders", label: "Orders", Icon: BoxIcon },
      { href: "/admin/products", label: "Products", Icon: ShirtIcon },
      { href: "/admin/categories", label: "Categories", Icon: TagIcon },
      { href: "/admin/messages", label: "Messages", Icon: InboxIcon },
    ],
  },
];

/** First letters of the signed-in name, for the footer avatar. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0]![0]! + (parts.length > 1 ? parts[parts.length - 1]![0]! : "")).toUpperCase();
}

export default function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);

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

  // On a phone the sidebar is a drawer; following a link should close it.
  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiSend("/api/admin/logout", "POST");
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  const current = (href: string) =>
    // "/admin" would otherwise stay highlighted on every sub-page.
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {/* Phone-width bar. The sidebar itself slides in over the content. */}
      <div className="adm__topbar">
        <button
          className="adm__burger"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <MenuIcon width={21} height={21} />
        </button>
        <Link className="adm__brand adm__brand--sm" href="/admin">
          <BrandMark size={22} />
          BinAr<span>Admin</span>
        </Link>
      </div>

      {open && <div className="adm__scrim" onClick={() => setOpen(false)} />}

      <aside className={open ? "adm__side is-open" : "adm__side"}>
        <div className="adm__side-head">
          <Link className="adm__brand" href="/admin">
            <BrandMark size={27} />
            BinAr<span>Admin</span>
          </Link>
          <button className="adm__burger adm__burger--close" onClick={() => setOpen(false)} aria-label="Close menu">
            <CloseIcon width={19} height={19} />
          </button>
        </div>

        <nav className="adm__nav">
          {GROUPS.map((group) => (
            <div className="adm__group" key={group.label}>
              <p className="adm__group-label">{group.label}</p>
              {group.links.map(({ href, label, Icon }) => (
                <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}>
                  <Icon width={19} height={19} />
                  <span>{label}</span>
                  {href === "/admin/messages" && unread > 0 && (
                    <span className="adm__count">{unread}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm__side-foot">
          <div className="adm__who">
            <span className="adm__avatar" aria-hidden="true">
              {initials(name)}
            </span>
            <span className="adm__who-name">{name}</span>
          </div>
          <Link className="adm__side-action" href="/" target="_blank" rel="noreferrer">
            <ShopIcon width={17} height={17} />
            View shop
          </Link>
          <button className="adm__side-action" onClick={signOut} disabled={signingOut}>
            <LogoutIcon width={17} height={17} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
    </>
  );
}
