"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/lib/icons";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Dashboard", icon: "chart-bar" },
  { href: "/admin/usuarios", label: "Usuários", icon: "users" },
  { href: "/admin/compradores", label: "Compradores", icon: "crown" },
  { href: "/admin/mensagens", label: "Mensagens", icon: "mail" },
  { href: "/admin/ia", label: "IA", icon: "sparkles" },
  { href: "/admin/hero", label: "Vídeo do Hero", icon: "movie" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text-1)] flex">
      <aside className="w-[240px] shrink-0 border-r-[0.5px] border-[var(--line)] bg-[var(--bg-1)] flex flex-col px-4 py-6">
        <div className="flex items-center gap-2 px-2 mb-8">
          <Icon name="shield" className="text-[var(--gold)] text-xl" />
          <span className="font-[var(--font-display)] font-extrabold text-lg">Admin</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--bg-2)] text-[var(--gold)] border-[0.5px] border-[var(--line-strong)]"
                    : "text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] border-[0.5px] border-transparent"
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
        >
          <Icon name="logout" />
          Sair
        </button>
      </aside>

      <main className="flex-1 px-10 py-8 max-w-[1200px]">{children}</main>
    </div>
  );
}
