import type { Customer } from "./types";

const NETWORK_NAMES = { mada: "Mada", visa: "Visa", mastercard: "Mastercard" } as const;

/** Scheme declines allowed per card per month. */
export function declineLimit(customer: Customer) {
  return (customer.card_network ?? "mada") === "mada" ? 3 : 6;
}

export function networkName(customer: Customer) {
  return NETWORK_NAMES[customer.card_network ?? "mada"];
}

export function cardDetails(customer: Customer) {
  const funding = customer.card_funding ?? "debit";
  const wallet = customer.card_token === "apple_pay" ? "Apple Pay" : "Card";
  return `${funding.charAt(0).toUpperCase()}${funding.slice(1)} · ${wallet}`;
}

export function cardSummary(customer: Customer) {
  return `${networkName(customer)} · ${cardDetails(customer)}`;
}
