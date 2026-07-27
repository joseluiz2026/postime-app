import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplatedMessage } from "@/lib/admin/message-templates";
import { listAllAuthUsers } from "@/lib/admin/users";
import { getAccessPhase, getPhaseDaysLeft } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron (see vercel.json) hits this once a day. Emails accounts on the last day
 * of the trial phase, and again on the last day of the following free/limited phase —
 * each at most once ever per account (profiles.trial_ending_sent / free_ending_sent).
 * Subscribed accounts are skipped entirely: an active subscription overrides the
 * phase-based limits (see lib/plan.ts), so neither warning is relevant to them.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [users, { data: sentFlags }, { data: activeSubs }] = await Promise.all([
    listAllAuthUsers(),
    supabase.from("profiles").select("user_id, trial_ending_sent, free_ending_sent"),
    supabase.from("subscriptions").select("user_id").eq("status", "active"),
  ]);
  const flagsByUser = new Map((sentFlags ?? []).map((r) => [r.user_id, r]));
  const subscribedSet = new Set((activeSubs ?? []).map((r) => r.user_id));

  let emailed = 0;
  for (const user of users) {
    if (!user.email || subscribedSet.has(user.id)) continue;
    const createdAt = new Date(user.created_at);
    const phase = getAccessPhase(createdAt);
    const daysLeft = getPhaseDaysLeft(createdAt);
    const flags = flagsByUser.get(user.id);
    if (daysLeft > 1) continue;

    if (phase === "trial" && !flags?.trial_ending_sent) {
      await sendTemplatedMessage("trial_ending", user.email);
      await supabase.from("profiles").upsert({ user_id: user.id, trial_ending_sent: true });
      emailed += 1;
    } else if (phase === "free" && !flags?.free_ending_sent) {
      await sendTemplatedMessage("free_ending", user.email);
      await supabase.from("profiles").upsert({ user_id: user.id, free_ending_sent: true });
      emailed += 1;
    }
  }

  return NextResponse.json({ ok: true, emailed });
}
