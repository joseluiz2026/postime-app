import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplatedMessage } from "@/lib/admin/message-templates";
import { listAllAuthUsers } from "@/lib/admin/users";
import { getAccessPhase, getPhaseDaysLeft } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron (see vercel.json) hits this once a day. Emails accounts on the last day
 * of their trial phase, at most once ever per account (profiles.trial_ending_sent).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [users, { data: alreadySent }] = await Promise.all([
    listAllAuthUsers(),
    supabase.from("profiles").select("user_id").eq("trial_ending_sent", true),
  ]);
  const sentSet = new Set((alreadySent ?? []).map((r) => r.user_id));

  let emailed = 0;
  for (const user of users) {
    if (!user.email || sentSet.has(user.id)) continue;
    const createdAt = new Date(user.created_at);
    const phase = getAccessPhase(createdAt);
    if (phase !== "trial" || getPhaseDaysLeft(createdAt) > 1) continue;

    await sendTemplatedMessage("trial_ending", user.email);
    await supabase.from("profiles").upsert({ user_id: user.id, trial_ending_sent: true });
    emailed += 1;
  }

  return NextResponse.json({ ok: true, emailed });
}
