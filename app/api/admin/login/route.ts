import { NextResponse } from "next/server";
import {
  checkLoginRateLimit,
  createAdminSession,
  getClientIp,
  logAdminAction,
  recordLoginAttempt,
  verifyAdminCredentials,
} from "@/lib/admin/auth";

export const runtime = "nodejs";

/**
 * Checked first by the normal /login form (see app/(site)/login/page.tsx) before it
 * falls back to Supabase auth. Returns { admin: false } — never a 401/404 — for any
 * non-admin credential, so this endpoint can't be used to enumerate whether a given
 * username is the admin account.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  const allowed = await checkLoginRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  if (!username || !password || !verifyAdminCredentials(username, password)) {
    await recordLoginAttempt(ip, false);
    return NextResponse.json({ admin: false });
  }

  await recordLoginAttempt(ip, true);
  await createAdminSession(ip);
  await logAdminAction("login", { ip });

  return NextResponse.json({ admin: true });
}
