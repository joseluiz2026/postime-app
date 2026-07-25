"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/lib/icons";

type UserRow = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  suspended: boolean;
  subscriptionStatus: "active" | "canceled" | "late" | null;
};

const SUB_LABELS: Record<string, string> = { active: "Ativo", canceled: "Cancelado", late: "Atrasado" };

function PlanBadge({ status }: { status: UserRow["subscriptionStatus"] }) {
  if (!status) return <span className="text-xs text-[var(--text-3)]">Free</span>;
  const color = status === "active" ? "text-[var(--teal)]" : "text-[var(--text-3)]";
  return <span className={`text-xs font-medium ${color}`}>{SUB_LABELS[status]}</span>;
}

function ResetPasswordControl({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-[var(--text-2)] hover:text-[var(--gold)]">
        Redefinir senha
      </button>
    );
  }

  async function submit() {
    if (password.length < 8) {
      setError("Mínimo 8 caracteres");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password", password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Falha ao redefinir");
      return;
    }
    setOpen(false);
    setPassword("");
    onDone();
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nova senha"
        className="w-28 bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-md text-xs px-2 py-1 outline-none focus:border-[var(--gold)]"
      />
      <button type="button" onClick={submit} disabled={busy} className="text-xs text-[var(--gold)]">
        {busy ? "..." : "Salvar"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--text-3)]">
        Cancelar
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

function DeleteControl({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) onDone();
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs text-red-400 hover:text-red-300">
        Excluir
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button type="button" onClick={submit} disabled={busy} className="text-xs text-red-400 font-semibold">
        {busy ? "..." : "Confirmar exclusão"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-[var(--text-3)]">
        Cancelar
      </button>
    </span>
  );
}

export function UsersTable({ subscribedOnly }: { subscribedOnly?: boolean }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/users${subscribedOnly ? "?subscribed=true" : ""}`);
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribedOnly]);

  async function toggleSuspend(user: UserRow) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: user.suspended ? "unsuspend" : "suspend" }),
    });
    load();
  }

  const filtered = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <div>
      <div className="relative mb-4 max-w-[320px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]">
          <Icon name="search" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          className="w-full bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
      </div>

      <div className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--text-3)] border-b border-[var(--line)]">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Cadastro</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-3)]">
                  Carregando…
                </td>
              </tr>
            )}
            {filtered?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-3)]">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {filtered?.map((u) => (
              <tr key={u.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 text-[var(--text-2)]">{u.email}</td>
                <td className="px-4 py-3 text-[var(--text-3)] font-mono text-xs">
                  {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <PlanBadge status={u.subscriptionStatus} />
                </td>
                <td className="px-4 py-3">
                  {u.suspended ? (
                    <span className="text-xs text-red-400">Suspenso</span>
                  ) : (
                    <span className="text-xs text-[var(--teal)]">Ativo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button type="button" onClick={() => toggleSuspend(u)} className="text-xs text-[var(--text-2)] hover:text-[var(--gold)]">
                      {u.suspended ? "Reativar" : "Suspender"}
                    </button>
                    <ResetPasswordControl userId={u.id} onDone={load} />
                    <DeleteControl userId={u.id} onDone={load} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
