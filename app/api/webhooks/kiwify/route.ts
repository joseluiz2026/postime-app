import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOwnerAlert } from "@/lib/alert-email";
import { sendTemplatedMessage } from "@/lib/admin/message-templates";

export const runtime = "nodejs";

/**
 * Kiwify calls this on order/subscription events (configured in the Kiwify dashboard
 * under Apps → Webhooks, pointing at this URL with ?token=... set to
 * KIWIFY_WEBHOOK_TOKEN). Grants or revokes public.subscriptions based on the event.
 *
 * Kiwify's exact payload shape still isn't confirmed against real traffic — their
 * public docs describe two different shapes (a flat body like `Customer.email` at the
 * root, and a newer enveloped `{ type, data: {...} }` form) without a concrete example
 * of either. Every field below is checked in BOTH shapes so this should work whichever
 * one actually arrives. Every call also gets logged in full to kiwify_webhook_log
 * (not just unmatched ones) — check that table against the first real event to confirm
 * (or fix) these field paths.
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

  // Some deliveries may wrap the real event in a `data` envelope — checking both
  // `body` and `body.data` covers either shape without needing to know which one
  // actually arrives ahead of time.
  const data = (typeof body?.data === "object" && body.data !== null ? body.data : null) as Record<
    string,
    unknown
  > | null;
  const roots = [body, data].filter((r): r is Record<string, unknown> => !!r);

  function firstString(paths: (root: Record<string, unknown>) => unknown): string {
    for (const root of roots) {
      const value = paths(root);
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  }

  const email = firstString(
    (r) =>
      (r.Customer as Record<string, unknown> | undefined)?.email ??
      (r.customer as Record<string, unknown> | undefined)?.email ??
      (r.buyer as Record<string, unknown> | undefined)?.email ??
      (r.Buyer as Record<string, unknown> | undefined)?.email ??
      r.email,
  ).toLowerCase();
  const orderId =
    firstString(
      (r) =>
        r.order_id ??
        (r.Order as Record<string, unknown> | undefined)?.order_id ??
        (r.order as Record<string, unknown> | undefined)?.id ??
        r.id,
    ) || null;
  const rawEvent = firstString(
    (r) =>
      r.type ??
      r.webhook_event_type ??
      r.event ??
      r.order_status ??
      (r.Order as Record<string, unknown> | undefined)?.status ??
      r.status,
  ).toLowerCase();

  const isApproved = /aprovad|approved|paid|renewed|renovad/.test(rawEvent);
  const isLate = /late|atrasad/.test(rawEvent);
  const isRevoked = /recusad|refused|reembols|refund|chargeback|cancel/.test(rawEvent);

  const supabase = createAdminClient();

  // Best-effort — logging every call is the whole point of this table, so a failure
  // here must never block the actual access-grant/revoke logic below.
  const logRow = async (matched: boolean) => {
    try {
      await supabase.from("kiwify_webhook_log").insert({
        raw_payload: body,
        parsed_email: email || null,
        parsed_event: rawEvent || null,
        matched,
      });
    } catch {
      // diagnostic only
    }
  };

  if (!email) {
    console.warn("[/api/webhooks/kiwify] no email found in payload, ignoring");
    await Promise.all([
      logRow(false),
      supabase.from("kiwify_unmatched_events").insert({ email: null, raw_payload: body }),
    ]);
    return NextResponse.json({ ok: true, ignored: "no_email" });
  }

  if (!isApproved && !isLate && !isRevoked) {
    // e.g. boleto_gerado, pix_gerado, carrinho_abandonado — informational, no access change.
    await logRow(false);
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
    await logRow(false);
    return NextResponse.json({ error: "user_lookup_failed" }, { status: 502 });
  }
  const listData = await listRes.json();
  const user = (listData.users ?? listData).find(
    (u: { email?: string }) => u.email?.toLowerCase() === email,
  );
  if (!user) {
    console.warn(`[/api/webhooks/kiwify] no POSTime account for ${email} — payment made with a different email?`);
    // Kept for self-service reconciliation — see app/api/account/link-payment.
    // Emails the payer directly too (not just the internal owner alert) — without
    // this they'd have no idea anything went wrong unless they happened to open the
    // upgrade modal and notice the reconciliation link themselves.
    await Promise.all([
      logRow(false),
      supabase.from("kiwify_unmatched_events").insert({ email, status, kiwify_order_id: orderId, raw_payload: body }),
      sendTemplatedMessage("payment_unmatched", email),
      sendOwnerAlert(
        "POSTime: pagamento Kiwify sem conta correspondente",
        `Um pagamento aprovado na Kiwify (pedido ${orderId ?? "sem id"}) usou o e-mail ${email}, que não bate com nenhuma conta do POSTime.\n\nO cliente pode resolver sozinho em "Já paguei mas minha conta não foi liberada" (no modal de assinatura), informando esse mesmo e-mail.`,
      ),
    ]);
    return NextResponse.json({ ok: true, ignored: "no_matching_account" });
  }

  // Fetched before the upsert so the email below only fires on an actual status
  // transition — otherwise every renewal ping (still "active") or retry of the same
  // event would re-send "assinatura ativada" every time.
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  const previousStatus = existingSub?.status ?? null;

  const { error: upsertErr } = await supabase
    .from("subscriptions")
    .upsert({ user_id: user.id, status, kiwify_order_id: orderId });
  if (upsertErr) {
    console.error("[/api/webhooks/kiwify] subscription upsert failed:", upsertErr.message);
    await logRow(false);
    return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  }

  if (status !== previousStatus) {
    const templateKey =
      status === "active" ? "subscription_activated" : status === "late" ? "subscription_late" : "subscription_canceled";
    await sendTemplatedMessage(templateKey, email);
  }

  await logRow(true);
  return NextResponse.json({ ok: true, email, status });
}
