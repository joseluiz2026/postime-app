import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * public.profiles has no row-per-signup guarantee (no DB trigger creates one, and the
 * app code no longer references it — the old lifetime-generation cap it was built for
 * was superseded by the day-based trial/free phase in lib/plan.ts). auth.users via the
 * admin API is the only reliable source of "who signed up" for the admin backend.
 */
export async function listAllAuthUsers(): Promise<User[]> {
  const supabase = createAdminClient();
  const perPage = 200;
  let page = 1;
  const all: User[] = [];

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return all;
}

export function isSuspended(user: User): boolean {
  const bannedUntil = (user as unknown as { banned_until?: string | null }).banned_until;
  if (!bannedUntil) return false;
  return new Date(bannedUntil).getTime() > Date.now();
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  suspended: boolean;
  subscriptionStatus: "active" | "canceled" | "late" | null;
};

/** Suspend forever = a ban_duration far beyond any real session; "none" lifts it. */
export const SUSPEND_DURATION = "876000h";

export async function getUsersWithSubscriptions(): Promise<AdminUserRow[]> {
  const supabase = createAdminClient();
  const [users, { data: subs }] = await Promise.all([
    listAllAuthUsers(),
    supabase.from("subscriptions").select("user_id, status"),
  ]);

  const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s.status as AdminUserRow["subscriptionStatus"]]));

  return users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.full_name as string | undefined)?.trim() || u.email || "—",
      createdAt: u.created_at,
      suspended: isSuspended(u),
      subscriptionStatus: subByUser.get(u.id) ?? null,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
