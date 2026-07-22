import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOwnerAlert } from "@/lib/alert-email";

export const runtime = "nodejs";

/**
 * Kiwify calls this on order/subscription events (configured in the Kiwify dashboard
 * under Apps → Webhooks, pointing at this URL with ?token=... set to
 * KIWIFY_WEBHOOK_TOKEN). Grants or revokes public.subscriptions based on the event.
 *
 * Kiwify's exact payload shape wasn't fully confirmed from public docs at the time
 * this was written (docs.kiwify.com.br only documents the webhook *creation* API, not
 * the delivered event body). This parses defensively — several plausible field paths
 * for email/event — and logs the full raw payload so the first real delivery (use the
 * "Testar Webhook" button in the Kiwify dashboard) can be inspected via `vercel logs`
 * and this tightened if the guesses are wrong.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-webhook-token");
  if (!process.env.KIWIFY_WEBHOOK_TOKEN || token !== process.env.KIWIFY_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  console.log("[/api/webhooks/kiwify] raw payload:", JSON.stringify(body));

  const email = String(
    body?.Customer?.email ?? body?.customer?.email ?? body?.buyer?.email ?? body?.Buyer?.email ?? "",
  )
    .trim()
    .toLowerCase();
  const orderId = String(body?.order_id ?? body?.Order?.order_id ?? body?.order?.id ?? "") || null;
  const rawEvent = String(
    body?.webhook_event_type ?? body?.event ?? body?.order_status ?? body?.Order?.status ?? "",
  ).toLowerCase();

  const isApproved = /aprovad|approved|paid|renewed|renovad/.test(rawEvent);
  const isLate = /late|atrasad/.test(rawEvent);
  const isRevoked = /recusad|refused|reembols|refund|chargeback|cancel/.test(rawEvent);

  const supabase = createAdminClient();

  if (!email) {
    console.warn("[/api/webhooks/kiwify] no email found in payload, ignoring");
    await supabase.from("kiwify_unmatched_events").insert({ email: null, raw_payload: body });
    return NextResponse.json({ ok: true, ignored: "no_email" });
  }

  if (!isApproved && !isLate && !isRevoked) {
    // e.g. boleto_gerado, pix_gerado, carrinho_abandonado — informational, no access change.
    return NextResponse.json({ ok: true, ignored: rawEvent || "unrecognized_event" });
  }

  const status = isApproved ? "active" : isLate ? "late" : "canceled";

  const listRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!listRes.ok) {
    console.error("[/api/webhooks/kiwify] user lookup failed:", listRes.status, await listRes.text());
    return NextResponse.json({ error: "user_lookup_failed" }, { status: 502 });
  }
  const listData = await listRes.json();
  const user = (listData.users ?? listData).find(
    (u: { email?: string }) => u.email?.toLowerCase() === email,
  );
  if (!user) {
    console.warn(`[/api/webhooks/kiwify] no POSTime account for ${email} — payment made with a different email?`);
    // Kept for self-service reconciliation — see app/api/account/link-payment.
    await supabase
      .from("kiwify_unmatched_events")
      .insert({ email, status, kiwify_order_id: orderId, raw_payload: body });
    await sendOwnerAlert(
      "POSTime: pagamento Kiwify sem conta correspondente",
      `Um pagamento aprovado na Kiwify (pedido ${orderId ?? "sem id"}) usou o e-mail ${email}, que não bate com nenhuma conta do POSTime.\n\nO cliente pode resolver sozinho em "Já paguei mas minha conta não foi liberada" (no modal de assinatura), informando esse mesmo e-mail.`,
    );
    return NextResponse.json({ ok: true, ignored: "no_matching_account" });
  }

  const { error: upsertErr } = await supabase
    .from("subscriptions")
    .upsert({ user_id: user.id, status, kiwify_order_id: orderId });
  if (upsertErr) {
    console.error("[/api/webhooks/kiwify] subscription upsert failed:", upsertErr.message);
    return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email, status });
}
