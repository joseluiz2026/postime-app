import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Self-service recovery for the "paid with a different email than my POSTime
 * account" case (see app/api/webhooks/kiwify). The logged-in user supplies whichever
 * email they used at Kiwify checkout; if it matches an unresolved
 * kiwify_unmatched_events row, this links that payment to their real account.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const paymentEmail = String(body?.email ?? "").trim().toLowerCase();
  if (!paymentEmail) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const admin = createAdminClient();
  const { data: event, error: findErr } = await admin
    .from("kiwify_unmatched_events")
    .select("id, status, kiwify_order_id")
    .eq("email", paymentEmail)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    console.error("[/api/account/link-payment] lookup failed:", findErr.message);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!event || !event.status) {
    return NextResponse.json({ error: "no_payment_found" }, { status: 404 });
  }

  const { error: upsertErr } = await admin
    .from("subscriptions")
    .upsert({ user_id: user.id, status: event.status, kiwify_order_id: event.kiwify_order_id });
  if (upsertErr) {
    console.error("[/api/account/link-payment] subscription upsert failed:", upsertErr.message);
    return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  }

  await admin
    .from("kiwify_unmatched_events")
    .update({ resolved_at: new Date().toISOString(), resolved_user_id: user.id })
    .eq("id", event.id);

  return NextResponse.json({ ok: true, status: event.status });
}
