import { NextResponse } from "next/server";
import { sendTemplatedMessage } from "@/lib/admin/message-templates";
import { listAllAuthUsers } from "@/lib/admin/users";

export const runtime = "nodejs";

/**
 * Fired client-side right after a successful signup (see app/(site)/cadastro).
 * Confirms a matching account actually exists before sending, so this can't be used
 * to spam arbitrary addresses with the welcome template.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) return NextResponse.json({ ok: false }, { status: 400 });

  const users = await listAllAuthUsers();
  const exists = users.some((u) => u.email?.toLowerCase() === email);
  if (!exists) return NextResponse.json({ ok: false }, { status: 404 });

  await sendTemplatedMessage("welcome", email);
  return NextResponse.json({ ok: true });
}
