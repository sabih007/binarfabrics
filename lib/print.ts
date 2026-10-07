/* ==========================================================================
   Printing the receipt at the right page size.

   `@page { size: 80mm auto }` looks like it should give a slip 80mm wide and
   as long as the content, but the CSS grammar only allows `auto` on its own —
   one or two lengths, or `auto`, never a mix. Chrome drops the whole
   declaration and falls back to Letter, which is why an 8cm receipt came out
   stranded at the top of an A4-sized sheet.

   A page size needs two real lengths, so the height is measured off the slip
   that is already on screen and written into an `@page` rule just before the
   dialog opens.
   ========================================================================== */

/** Print layout is resolved at 96dpi, so one CSS pixel is this many mm. */
const MM_PER_PX = 25.4 / 96;

/** Width of the thermal roll. Matches the `.rcpt` width in pos.css. */
const ROLL_MM = 80;

/** A couple of mm past the last line, so nothing sits on the cut. */
const TAIL_MM = 3;

/** Height used when the slip can't be measured — generous, then cut. */
const FALLBACK_MM = 200;

const STYLE_ID = "rcpt-page-size";

/**
 * Opens the print dialog with the page sized to the receipt.
 *
 * The injected rule is left in the document: `@page` only applies while
 * printing, so there is nothing to clean up and no race with the dialog
 * closing — the next call simply rewrites it.
 */
export function printReceipt() {
  if (typeof document === "undefined") return;

  const slip = document.querySelector<HTMLElement>(".rcpt");
  let heightMm = FALLBACK_MM;

  if (slip) {
    // On screen the slip is set in slightly larger type with more padding
    // than it prints at, so measuring it as-is would over-run the page.
    // `.rcpt--measure` puts it on the print metrics for the measurement
    // alone — one layout pass, before the browser paints again.
    slip.classList.add("rcpt--measure");
    const measured = slip.getBoundingClientRect().height * MM_PER_PX;
    slip.classList.remove("rcpt--measure");

    if (measured > 0) heightMm = Math.ceil(measured) + TAIL_MM;
  }

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    // Appended last so it outranks the `@page` fallback in pos.css.
    document.head.append(style);
  }
  style.textContent = `@page { size: ${ROLL_MM}mm ${heightMm}mm; margin: 0; }`;

  window.print();
}
