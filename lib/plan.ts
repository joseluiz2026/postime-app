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

/** An active subscription (see public.subscriptions, written by the Kiwify webhook) always overrides the phase-based limits below. */
export function dailyVideoLimitFor(phase: AccessPhase, isSubscribed: boolean): number | null {
  if (isSubscribed) return null;
  if (phase === "trial") return TRIAL_DAILY_VIDEOS;
  if (phase === "free") return FREE_DAILY_VIDEOS;
  return null;
}

export function allowedDurationsFor(phase: AccessPhase, isSubscribed: boolean): readonly Duration[] {
  if (isSubscribed) return ALL_DURATIONS;
  return phase === "free" ? FREE_DURATIONS : ALL_DURATIONS;
}

/**
 * Kiwify checkout link for the POSTime subscription. See app/api/webhooks/kiwify for
 * how a completed checkout turns into a public.subscriptions row.
 */
export const KIWIFY_CHECKOUT_URL = "https://pay.kiwify.com.br/HRodY1I";
