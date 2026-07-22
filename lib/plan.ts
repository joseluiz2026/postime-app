/**
 * Everyone gets this many days of fully unrestricted use, starting at signup — no
 * generation cap, BYOK or not. After it ends, an active subscription is required to
 * keep using the app at all; there is deliberately no other free tier or bypass.
 */
export const TRIAL_DAYS = 7;

/**
 * Kiwify checkout link for the POSTime subscription. Access is still gated purely by
 * TRIAL_DAYS on the server (app/api/roteiros/generate/route.ts) — this link lets
 * someone pay, but nothing yet marks their account as subscribed after checkout.
 * TODO(Kiwify): once the webhook is wired up, replace the hardcoded
 * `hasActiveSubscription = false` in that route with a real lookup.
 */
export const KIWIFY_CHECKOUT_URL = "https://pay.kiwify.com.br/HRodY1I";
