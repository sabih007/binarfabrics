"use client";

import { printReceipt } from "@/lib/print";

/** The receipt page is otherwise a server component; only this needs the DOM. */
export default function PrintButton() {
  return (
    <button className="adm-btn adm-btn--primary" onClick={printReceipt}>
      Print receipt
    </button>
  );
}
