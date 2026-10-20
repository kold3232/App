/**
 * The smallest card payment Stripe will process in sterling.
 *
 * Nothing in the app can be paid for below this, so anything that ends up
 * being charged — a quote, a deposit, a final bill — is checked against it at
 * the point someone types the number, rather than at the point the customer
 * taps Pay and gets a failure they cannot do anything about.
 *
 * The real enforcement is in create-job-payment, which is where the charge is
 * actually made. This is here so the business finds out first.
 */
export const MIN_CARD_PAYMENT = 0.3;

export const formatMoney = (n: number) => `£${n.toFixed(2)}`;

/** The same sentence wherever a figure is too small to charge. */
export const tooSmallToCharge = (noun: string) =>
  `Card payments have to be at least ${formatMoney(MIN_CARD_PAYMENT)}, so ${noun} cannot be less than that.`;
