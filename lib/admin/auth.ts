import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

export const ADMIN_SESSION_COOKIE = "postime_admin_session";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** True if this IP is still allowed to attempt an admin login. */
export async function checkLoginRateLimit(ip: string): Promise<boolean> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("success", false)
    .gte("created_at", since);
  return (count ?? 0) < LOGIN_MAX_ATTEMPTS;
}

export async function recordLoginAttempt(ip: string, success: boolean) {
  const supabase = createAdminClient();
  await supabase.from("admin_login_attempts").insert({ ip, success });
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUsername || !expectedHash) return false;
  if (username !== expectedUsername) return false;
  return bcrypt.compareSync(password, expectedHash);
}

/** Creates a new session (invalidating any previous one — single active admin session) and sets the cookie. */
export async function createAdminSession(ip: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const supabase = createAdminClient();
  await supabase.from("admin_sessions").delete().not("id", "is", null);
  await supabase.from("admin_sessions").insert({ token_hash: tokenHash, expires_at: expiresAt.toISOString(), ip });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Reads and validates the admin session cookie for the current request. */
export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_sessions")
    .select("expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!data) return false;
  return new Date(data.expires_at).getTime() > Date.now();
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const supabase = createAdminClient();
    await supabase.from("admin_sessions").delete().eq("token_hash", tokenHash);
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function logAdminAction(
  action: string,
  opts?: { targetUserId?: string; metadata?: Record<string, unknown>; ip?: string },
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("admin_audit_log").insert({
    action,
    target_user_id: opts?.targetUserId ?? null,
    metadata: opts?.metadata ?? null,
    ip: opts?.ip ?? null,
  });
}
