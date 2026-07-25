import { NextResponse } from "next/server";
import { getAdminSession, getClientIp, logAdminAction } from "@/lib/admin/auth";
import { sendEmail } from "@/lib/email";
import { listAllAuthUsers } from "@/lib/admin/users";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const subject = String(body?.subject ?? "").trim();
  const messageBody = String(body?.body ?? "").trim();
  const to = String(body?.to ?? "").trim();

  if (!subject || !messageBody || !to) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const html = `<p>${messageBody.replace(/\n/g, "<br/>")}</p>`;
  const recipients = to === "all" ? (await listAllAuthUsers()).map((u) => u.email).filter((e): e is string => Boolean(e)) : [to];

  let sent = 0;
  for (const email of recipients) {
    const ok = await sendEmail(email, subject, html);
    if (ok) sent += 1;
  }

  await logAdminAction("send_message", {
    metadata: { subject, to, recipients: recipients.length, sent },
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true, sent, total: recipients.length });
}
