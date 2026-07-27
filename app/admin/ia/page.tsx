"use client";

import { useEffect, useState } from "react";

type ConfigRow = { key: string; value: string; updated_at: string };

const LABELS: Record<string, { title: string; hint: string }> = {
  free_primary_model: {
    title: "Modelo principal (Groq)",
    hint: "Usado por padrão em toda geração do plano grátis. Ex: openai/gpt-oss-120b",
  },
  free_fallback_model: {
    title: "Modelo de fallback (Gemini)",
    hint: "Usado só se o modelo principal falhar. Ex: gemini-3.5-flash",
  },
};

function ConfigCard({ row, onSaved }: { row: ConfigRow; onSaved: () => void }) {
  const [value, setValue] = useState(row.value);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const info = LABELS[row.key] ?? { title: row.key, hint: "" };

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/admin/ai-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: row.key, value }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      onSaved();
    }
  }

  return (
    <div className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-1">{info.title}</h3>
      <p className="text-xs text-[var(--text-3)] mb-3">{info.hint}</p>
      <div className="flex items-center gap-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-[var(--gold)]"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220] shrink-0"
        >
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </div>
      <p className="text-xs text-[var(--text-3)] mt-2">
        Atual desde {new Date(row.updated_at).toLocaleString("pt-BR")}
        {saved && <span className="text-[var(--teal)]"> · salvo (pode levar até 1 min pra valer, há um cache curto)</span>}
      </p>
    </div>
  );
}

type PoolKeySlot = {
  slot: "groq_1" | "groq_2" | "google_1" | "google_2";
  hasOverride: boolean;
  fingerprint: string | null;
  updatedAt: string | null;
  hasEnvFallback: boolean;
};

const POOL_KEY_LABELS: Record<PoolKeySlot["slot"], string> = {
  groq_1: "Groq — chave 1",
  groq_2: "Groq — chave 2",
  google_1: "Gemini — chave 1",
  google_2: "Gemini — chave 2",
};

function PoolKeyCard({ row, onSaved }: { row: PoolKeySlot; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!value.trim()) return;
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/admin/ai-pool-keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot: row.slot, value: value.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setValue("");
      setSaved(true);
      onSaved();
    }
  }

  async function clearOverride() {
    setBusy(true);
    await fetch("/api/admin/ai-pool-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot: row.slot }),
    });
    setBusy(false);
    onSaved();
  }

  const status = row.hasOverride
    ? `Trocada por aqui · termina em …${row.fingerprint}`
    : row.hasEnvFallback
      ? "Usando a chave padrão (variável de ambiente)"
      : "Não configurada — essa vaga do pool fica ociosa";

  return (
    <div className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-1">{POOL_KEY_LABELS[row.slot]}</h3>
      <p className="text-xs text-[var(--text-3)] mb-3">{status}</p>
      <div className="flex items-center gap-3">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Colar nova chave para trocar..."
          className="flex-1 bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-[var(--gold)]"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy || !value.trim()}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220] shrink-0 disabled:opacity-50"
        >
          {busy ? "Salvando..." : "Trocar"}
        </button>
        {row.hasOverride && (
          <button
            type="button"
            onClick={clearOverride}
            disabled={busy}
            className="text-sm font-medium px-4 py-2 rounded-lg border-[0.5px] border-[var(--line)] text-[var(--text-2)] shrink-0"
          >
            Reverter
          </button>
        )}
      </div>
      {row.updatedAt && (
        <p className="text-xs text-[var(--text-3)] mt-2">
          Trocada em {new Date(row.updatedAt).toLocaleString("pt-BR")}
          {saved && <span className="text-[var(--teal)]"> · salvo agora</span>}
        </p>
      )}
    </div>
  );
}

export default function AdminAiPage() {
  const [config, setConfig] = useState<ConfigRow[] | null>(null);
  const [poolKeys, setPoolKeys] = useState<PoolKeySlot[] | null>(null);

  async function load() {
    const res = await fetch("/api/admin/ai-config");
    const data = await res.json();
    setConfig(data.config ?? []);
  }

  async function loadPoolKeys() {
    const res = await fetch("/api/admin/ai-pool-keys");
    const data = await res.json();
    setPoolKeys(data.slots ?? []);
  }

  useEffect(() => {
    load();
    loadPoolKeys();
  }, []);

  return (
    <div>
      <h1 className="font-[var(--font-display)] font-extrabold text-2xl mb-2">IA</h1>
      <p className="text-sm text-[var(--text-3)] mb-6">
        Modelos usados na geração de roteiros do plano grátis (chave da própria POSTime). Não afeta usuários com sua
        própria chave (BYOK).
      </p>
      <div className="grid grid-cols-1 gap-4 max-w-[560px]">{config?.map((row) => <ConfigCard key={row.key} row={row} onSaved={load} />)}</div>

      <h2 className="font-[var(--font-display)] font-extrabold text-xl mt-10 mb-2">Chaves do pool grátis</h2>
      <p className="text-sm text-[var(--text-3)] mb-6">
        As gerações do plano grátis passam por até 4 chaves nessa ordem — Groq 1 → Groq 2 → Gemini 1 → Gemini 2 —,
        pulando para a próxima sempre que uma falhar ou bater limite de uso. Troque uma chave aqui se ela vazar, expirar
        ou começar a falhar direto (veja os alertas em Vazamentos/fallback). Sem override aqui, cada vaga usa a
        variável de ambiente padrão.
      </p>
      <div className="grid grid-cols-1 gap-4 max-w-[560px]">
        {poolKeys?.map((row) => <PoolKeyCard key={row.slot} row={row} onSaved={loadPoolKeys} />)}
      </div>
    </div>
  );
}
