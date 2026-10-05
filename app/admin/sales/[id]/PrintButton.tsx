"use client";

/** The receipt page is otherwise a server component; only this needs the DOM. */
export default function PrintButton() {
  return (
    <button className="adm-btn adm-btn--primary" onClick={() => window.print()}>
      Print receipt
    </button>
  );
}
