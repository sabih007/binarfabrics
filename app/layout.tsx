import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: { default: "BinAr Fabrics — Premium Unstitched Fabrics & Ready to Wear in Pakistan", template: "%s — BinAr Fabrics" },
  description: "Shop premium lawn, cotton, linen, chiffon and men's unstitched fabrics from BinAr Fabrics. Free delivery over PKR 3,000, cash on delivery across Pakistan.",
  icons: { icon: "/favicon.svg" },
};

/**
 * Document shell only. The storefront chrome (header, footer, cart) lives in
 * app/(shop)/layout.tsx so the admin area at /admin can render without it.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
