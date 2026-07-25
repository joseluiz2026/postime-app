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

export default function AdminAiPage() {
  const [config, setConfig] = useState<ConfigRow[] | null>(null);

  async function load() {
    const res = await fetch("/api/admin/ai-config");
    const data = await res.json();
    setConfig(data.config ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-[var(--font-display)] font-extrabold text-2xl mb-2">IA</h1>
      <p className="text-sm text-[var(--text-3)] mb-6">
        Modelos usados na geração de roteiros do plano grátis (chave da própria POSTime). Não afeta usuários com sua
        própria chave (BYOK).
      </p>
      <div className="grid grid-cols-1 gap-4 max-w-[560px]">{config?.map((row) => <ConfigCard key={row.key} row={row} onSaved={load} />)}</div>
    </div>
  );
}
