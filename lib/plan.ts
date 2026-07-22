export type Duration = "15s" | "30s" | "60s";

/** Days 1-7 from signup: up to TRIAL_DAILY_VIDEOS videos/day, any duration. */
export const TRIAL_DAYS = 7;
export const TRIAL_DAILY_VIDEOS = 5;

/**
 * Days 8-14 from signup ("segunda chance"): a degraded free tier instead of an
 * immediate hard lock — up to FREE_DAILY_VIDEOS videos/day, duration limited to
 * FREE_DURATIONS. After this window, an active subscription is required for
 * everything (see hasActiveSubscription in the API routes).
 */
export const FREE_DAYS = 7;
export const FREE_DAILY_VIDEOS = 2;
export const FREE_DURATIONS: readonly Duration[] = ["15s"];

export const ALL_DURATIONS: readonly Duration[] = ["15s", "30s", "60s"];

export type AccessPhase = "trial" | "free" | "locked";

export function getAccessPhase(createdAt: Date, now: number = Date.now()): AccessPhase {
  const daysSinceSignup = (now - createdAt.getTime()) / 86_400_000;
  if (daysSinceSignup < TRIAL_DAYS) return "trial";
  if (daysSinceSignup < TRIAL_DAYS + FREE_DAYS) return "free";
  return "locked";
}

/** Whole days remaining in the phase the account is currently in (trial or free). */
export function getPhaseDaysLeft(createdAt: Date, now: number = Date.now()): number {
  const daysSinceSignup = (now - createdAt.getTime()) / 86_400_000;
  const phaseEndDay = daysSinceSignup < TRIAL_DAYS ? TRIAL_DAYS : TRIAL_DAYS + FREE_DAYS;
  return Math.max(0, Math.ceil(phaseEndDay - daysSinceSignup));
}

export function dailyVideoLimitFor(phase: AccessPhase): number | null {
  if (phase === "trial") return TRIAL_DAILY_VIDEOS;
  if (phase === "free") return FREE_DAILY_VIDEOS;
  return null;
}

export function allowedDurationsFor(phase: AccessPhase): readonly Duration[] {
  return phase === "free" ? FREE_DURATIONS : ALL_DURATIONS;
}

/**
 * Kiwify checkout link for the POSTime subscription. Access phase is still computed
 * purely from signup date + the constants above — this link lets someone pay, but
 * nothing yet marks their account as subscribed after checkout.
 * TODO(Kiwify): once the webhook is wired up, replace the hardcoded
 * `hasActiveSubscription = false` in the API routes with a real lookup, which should
 * make getAccessPhase irrelevant for a subscribed account (unrestricted regardless of
 * signup date).
 */
export const KIWIFY_CHECKOUT_URL = "https://pay.kiwify.com.br/HRodY1I";
