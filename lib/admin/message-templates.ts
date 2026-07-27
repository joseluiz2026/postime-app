import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export const MESSAGE_TEMPLATE_KEYS = [
  "welcome",
  "limit_reached",
  "trial_ending",
  "free_ending",
  "subscription_activated",
  "subscription_late",
  "subscription_canceled",
  "payment_unmatched",
] as const;

export type MessageTemplateKey = (typeof MESSAGE_TEMPLATE_KEYS)[number];

/** Sends the current (admin-editable) content for a template key. Best-effort — a
 * failure here must never break the signup/generation/cron flow that triggered it. */
export async function sendTemplatedMessage(key: MessageTemplateKey, to: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("message_templates").select("subject, body").eq("key", key).maybeSingle();
    if (!data) return;
    await sendEmail(to, data.subject, `<p>${data.body.replace(/\n/g, "<br/>")}</p>`);
  } catch (err) {
    console.error(`[message-templates] failed to send "${key}":`, err instanceof Error ? err.message : err);
  }
}

const LIMIT_EMAIL_COOLDOWN_MS = 20 * 60 * 60 * 1000;

/** Fires the limit_reached template at most once per ~day per user (profiles.last_limit_email_at). */
export async function sendLimitReachedEmailOnce(userId: string, email: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_limit_email_at")
      .eq("user_id", userId)
      .maybeSingle();

    const lastSent = profile?.last_limit_email_at ? new Date(profile.last_limit_email_at).getTime() : 0;
    if (Date.now() - lastSent < LIMIT_EMAIL_COOLDOWN_MS) return;

    await sendTemplatedMessage("limit_reached", email);
    await supabase.from("profiles").upsert({ user_id: userId, last_limit_email_at: new Date().toISOString() });
  } catch (err) {
    console.error("[message-templates] limit_reached dedup failed:", err instanceof Error ? err.message : err);
  }
}
