/* ==========================================================================
   Sidebar icons.

   Same drawing conventions as components/Icons.tsx — 24px box, 1.6 stroke,
   currentColor — so the two sets sit together without looking borrowed.
   Kept separate because nothing on the storefront needs them.
   ========================================================================== */

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const GridIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </svg>
);

/** Till: a counter terminal with a slip coming out of it. */
export const TillIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="6" rx="1.5" />
    <path d="M6 14h4M6 17.5h4" />
    <path d="M4.5 10v10h15V10" />
    <path d="M14 14h5.5v6H14z" />
  </svg>
);

export const ReceiptIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 3h14v18l-2.3-1.6L14.4 21l-2.4-1.6L9.6 21l-2.3-1.6L5 21z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

export const BoxIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
    <path d="M3 7.5 12 12l9-4.5M12 12v9" />
  </svg>
);

export const ShirtIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 3 5 5 3 9l3 1.5V21h12V10.5L21 9l-2-4-4-2" />
    <path d="M9 3a3 3 0 0 0 6 0" />
  </svg>
);

export const TagIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 12.5V4a1 1 0 0 1 1-1h8.5L21 11.5 12.5 20z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);

export const InboxIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 8 9 6 9-6" />
  </svg>
);

export const LogoutIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 8 6 12l4 4M6 12h10" />
  </svg>
);

export const ShopIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 4h16l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" />
    <path d="M5 11v9h14v-9" />
  </svg>
);

export const MenuIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
