import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — BinAr Admin" },
  // Keep the dashboard out of search results.
  robots: { index: false, follow: false },
};

/**
 * Admin shell. The login page renders its own bare layout, so the nav is
 * only drawn once a session exists.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Middleware sends every signed-out visitor to /admin/login, so "no session"
  // means we're on the login screen — render it without the nav or padding.
  if (!session) return <div className="adm">{children}</div>;

  return (
    <div className="adm">
      <AdminNav name={session.name} />
      <div className="adm__main">{children}</div>
    </div>
  );
}
