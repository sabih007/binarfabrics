/* ==========================================================================
   Shop bank account, for direct-transfer orders.

   Held in environment variables rather than the source tree: an account
   number is the shop's, not the codebase's, and it changes without a deploy.
   These are NEXT_PUBLIC_ because the checkout page has to print them for the
   customer — that is the whole point of the method, and an IBAN plus account
   title is what you would hand over anyway. Never put anything here that
   wouldn't go on an invoice.

   Safe to import from both server and client components.
   ========================================================================== */

export const BANK = {
  /** e.g. "Meezan Bank" */
  name: process.env.NEXT_PUBLIC_BANK_NAME || "",
  /** The account title — who the transfer is made out to. */
  title: process.env.NEXT_PUBLIC_BANK_TITLE || "",
  iban: process.env.NEXT_PUBLIC_BANK_IBAN || "",
  /** Optional plain account number, where a customer's app asks for one. */
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT || "",
};

/**
 * Bank transfer only appears at checkout once there is somewhere to send the
 * money. An IBAN with no bank name would leave the customer guessing, so both
 * are required before the option is offered.
 */
export const bankEnabled = Boolean(BANK.iban && BANK.name);

/** "PK83 MEZN 0002 4801 1576 3738" — grouped the way a bank prints it. */
export const formatIban = (iban: string) =>
  iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
