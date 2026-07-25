import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/admin/users";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function last30Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export type AdminStats = {
  kpis: {
    totalCadastrados: number;
    assinantesAtivos: number;
    videosGeradosHoje: number;
    videosGeradosTotal: number;
  };
  series: { days: string[]; signups: number[]; videos: number[] };
  auditLog: { action: string; target_user_id: string | null; metadata: unknown; created_at: string }[];
};

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createAdminClient();
  const days = last30Days();
  const since = `${days[0]}T00:00:00.000Z`;
  const todayKey = days[days.length - 1];

  const [users, { count: activeSubsCount }, { data: jobs }, { count: videosTotalCount }, { data: auditLog }] =
    await Promise.all([
      listAllAuthUsers(),
      supabase.from("subscriptions").select("user_id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("jobs").select("created_at, status").eq("status", "pronto").gte("created_at", since),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pronto"),
      supabase
        .from("admin_audit_log")
        .select("action, target_user_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const signupsByDay = new Map(days.map((d) => [d, 0]));
  for (const user of users) {
    const key = dayKey(user.created_at);
    if (signupsByDay.has(key)) signupsByDay.set(key, (signupsByDay.get(key) ?? 0) + 1);
  }

  const videosByDay = new Map(days.map((d) => [d, 0]));
  let videosToday = 0;
  for (const job of jobs ?? []) {
    const key = dayKey(job.created_at);
    if (key === todayKey) videosToday += 1;
    if (videosByDay.has(key)) videosByDay.set(key, (videosByDay.get(key) ?? 0) + 1);
  }

  return {
    kpis: {
      totalCadastrados: users.length,
      assinantesAtivos: activeSubsCount ?? 0,
      videosGeradosHoje: videosToday,
      videosGeradosTotal: videosTotalCount ?? 0,
    },
    series: {
      days,
      signups: days.map((d) => signupsByDay.get(d) ?? 0),
      videos: days.map((d) => videosByDay.get(d) ?? 0),
    },
    auditLog: auditLog ?? [],
  };
}
