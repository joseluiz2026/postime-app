"use client";

import { useEffect, useState } from "react";

type Template = { key: string; subject: string; body: string; updated_at: string };

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: "Boas-vindas (no cadastro)",
  limit_reached: "Limite diário atingido",
  trial_ending: "Trial acabando",
};

function TemplateCard({ template, onSaved }: { template: Template; onSaved: () => void }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/admin/message-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: template.key, subject, body }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      onSaved();
    }
  }

  return (
    <div className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-3">{TEMPLATE_LABELS[template.key] ?? template.key}</h3>
      <label className="block mb-3">
        <span className="block text-xs text-[var(--text-3)] mb-1.5">Assunto</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
      </label>
      <label className="block mb-3">
        <span className="block text-xs text-[var(--text-3)] mb-1.5">Mensagem</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--gold)] resize-y"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220]"
        >
          {busy ? "Salvando..." : "Salvar"}
        </button>
        {saved && <span className="text-xs text-[var(--teal)]">Salvo.</span>}
      </div>
    </div>
  );
}

function AvulsaForm() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/admin/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: to.trim() || "all", subject, body }),
    });
    const data = await res.json();
    setBusy(false);
    setResult(res.ok ? `Enviado para ${data.sent}/${data.total}.` : "Falha ao enviar.");
  }

  return (
    <div className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-3">Mensagem avulsa</h3>
      <label className="block mb-3">
        <span className="block text-xs text-[var(--text-3)] mb-1.5">Destinatário</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder='E-mail do usuário, ou deixe vazio + clique "all" para todos'
          className="w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
        <button type="button" onClick={() => setTo("all")} className="text-xs text-[var(--gold)] mt-1.5">
          Enviar para todos os usuários
        </button>
      </label>
      <label className="block mb-3">
        <span className="block text-xs text-[var(--text-3)] mb-1.5">Assunto</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
        />
      </label>
      <label className="block mb-3">
        <span className="block text-xs text-[var(--text-3)] mb-1.5">Mensagem</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--gold)] resize-y"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={busy || !subject || !body}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220] disabled:opacity-50"
        >
          {busy ? "Enviando..." : "Enviar"}
        </button>
        {result && <span className="text-xs text-[var(--text-2)]">{result}</span>}
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);

  async function load() {
    const res = await fetch("/api/admin/message-templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="font-[var(--font-display)] font-extrabold text-2xl mb-6">Mensagens</h1>

      <h2 className="text-sm font-semibold text-[var(--text-2)] mb-3">Automáticas</h2>
      <div className="grid grid-cols-1 gap-4 mb-8">
        {templates?.map((t) => (
          <TemplateCard key={t.key} template={t} onSaved={load} />
        ))}
      </div>

      <h2 className="text-sm font-semibold text-[var(--text-2)] mb-3">Avulsa</h2>
      <AvulsaForm />
    </div>
  );
}
