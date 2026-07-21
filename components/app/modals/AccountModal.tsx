"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { PROVIDER_LABELS, type LlmProvider } from "@/lib/ai/generate-roteiros";
import { useWizard } from "@/lib/wizard-context";
import { createClient } from "@/lib/supabase/client";
import { Btn, FieldLabel, ModalShell, TextArea, TextInput } from "../ui";

const TITLES: Record<string, { icon: string; title: string }> = {
  password: { icon: "lock", title: "Trocar senha" },
  report: { icon: "alert-triangle", title: "Relatar problema" },
  faq: { icon: "help", title: "Perguntas frequentes" },
  support: { icon: "message-bot", title: "Suporte por IA" },
  apikey: { icon: "key", title: "Minha chave de API" },
};

const FAQ_ITEMS = [
  {
    q: "Quantos vídeos posso gerar no plano Free?",
    a: "18 gerações no total (não é por dia). Depois disso, conecte sua própria chave de API em \"Minha chave de API\" para continuar gerando sem limite.",
  },
  {
    q: "Preciso pagar pela ElevenLabs pra clonar minha voz?",
    a: "Sim, a clonagem exige pelo menos o plano pago mínimo deles. Vozes prontas da biblioteca gratuita não exigem.",
  },
  {
    q: "Como as imagens dos vídeos são escolhidas?",
    a: "Automaticamente, dos bancos gratuitos Unsplash, Pexels e Pixabay — ou você pode subir as suas próprias na aba Fonte.",
  },
  {
    q: "Publicar no TikTok é automático?",
    a: 'Depende: o Share Kit abre o TikTok pra você confirmar; a publicação 100% automática está em auditoria pelo TikTok.',
  },
];

function PasswordForm() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSuccess(false);
    if (pw.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (pw !== pw2) {
      setError("As senhas não coincidem.");
      return;
    }
    setError("");
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPw("");
    setPw2("");
    setSuccess(true);
  }

  return (
    <div>
      <FieldLabel htmlFor="pwNew">Nova senha</FieldLabel>
      <TextInput id="pwNew" type="password" placeholder="Mínimo 8 caracteres" value={pw} onChange={(e) => setPw(e.target.value)} />
      <div className="mt-3">
        <FieldLabel htmlFor="pwConfirm">Confirmar nova senha</FieldLabel>
        <TextInput id="pwConfirm" type="password" placeholder="Repita a nova senha" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </div>
      {error && (
        <p className="text-[12.5px] text-[var(--text-2)] mt-3">
          <Icon name="alert-triangle" /> {error}
        </p>
      )}
      {success && <p className="text-[12.5px] text-[var(--teal)] mt-3">Senha atualizada com sucesso.</p>}
      <div className="mt-4">
        <Btn variant="primary" disabled={saving} onClick={save}>
          <Icon name="check" /> Salvar nova senha
        </Btn>
      </div>
    </div>
  );
}

function ReportForm() {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div>
      <FieldLabel htmlFor="reportText">O que aconteceu?</FieldLabel>
      <TextArea id="reportText" placeholder="Descreva o problema que você encontrou..." value={text} onChange={(e) => setText(e.target.value)} />
      {sent && <p className="text-[12.5px] text-[var(--teal)] mt-3">Obrigado! Nossa equipe vai analisar em breve.</p>}
      <div className="mt-4">
        <Btn variant="primary" onClick={() => setSent(true)}>
          <Icon name="check" /> Enviar relatório
        </Btn>
      </div>
    </div>
  );
}

function FaqBody() {
  return (
    <div>
      {FAQ_ITEMS.map((item) => (
        <details key={item.q} className="border-b-[0.5px] border-[var(--line)] py-2.5 last:border-b-0 group">
          <summary className="cursor-pointer text-[13px] font-medium text-[var(--text-1)] list-none marker:hidden before:content-['+'] before:inline-block before:w-3.5 before:text-[var(--gold)] group-open:before:content-['–']">
            {item.q}
          </summary>
          <p className="text-xs text-[var(--text-2)] leading-relaxed mt-2 ml-5">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

function SupportBody() {
  return (
    <div>
      <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed mb-2">
        Um agente de IA que responde dúvidas sobre o POSTime na hora, 24h por dia.
      </p>
      <p className="text-[13px] text-[var(--text-2)] leading-relaxed">
        <Icon name="lock" /> Recurso em desenvolvimento — como envolve custo por conversa (chamadas de API de IA), a
        ideia é liberar primeiro pro plano Pro.
      </p>
      <div className="mt-4">
        <Btn disabled>
          <Icon name="message-bot" /> Em breve
        </Btn>
      </div>
    </div>
  );
}

function ApiKeyForm() {
  const wizard = useWizard();
  const [provider, setProvider] = useState<LlmProvider>("google");
  const [apiKey, setApiKey] = useState("");
  const [success, setSuccess] = useState(false);

  async function save() {
    setSuccess(false);
    if (!apiKey.trim()) return;
    const ok = await wizard.saveOwnKey(provider, apiKey.trim());
    if (ok) {
      setApiKey("");
      setSuccess(true);
    }
  }

  async function remove() {
    await wizard.removeOwnKey();
    setSuccess(false);
  }

  if (wizard.hasOwnKey) {
    return (
      <div>
        <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed mb-3">
          <Icon name="circle-check" className="text-[var(--teal)]" /> Chave conectada:{" "}
          <strong className="text-[var(--text-1)]">{PROVIDER_LABELS[wizard.ownKeyProvider!]}</strong>. Suas gerações
          de roteiro estão sem limite, usando essa chave.
        </p>
        <Btn disabled={wizard.savingKey} onClick={remove}>
          <Icon name="alert-triangle" /> Remover chave
        </Btn>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed mb-3">
        Sem chave própria, você tem gerações grátis limitadas usando a chave do POSTime. Conecte sua própria chave
        de API (OpenAI, Google Gemini, Anthropic ou Groq) para gerar roteiros sem limite — o custo passa a ser seu,
        com o provedor escolhido.
      </p>
      <FieldLabel htmlFor="apiProvider">Provedor</FieldLabel>
      <select
        id="apiProvider"
        value={provider}
        onChange={(e) => setProvider(e.target.value as LlmProvider)}
        className="w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[9px] text-[var(--text-1)] font-sans text-sm px-[14px] py-[11px] outline-none transition-all hover:border-[var(--line-strong)] focus:border-[var(--gold)] focus:bg-[var(--bg-3)]"
      >
        <option value="google">Google Gemini</option>
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="groq">Groq</option>
      </select>
      <div className="mt-3">
        <FieldLabel htmlFor="apiKeyInput">Chave de API</FieldLabel>
        <TextInput
          id="apiKeyInput"
          type="password"
          placeholder="Cole sua chave aqui"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      {wizard.keyError && (
        <p className="text-[12.5px] text-[var(--gold)] mt-3">
          <Icon name="alert-triangle" /> {wizard.keyError}
        </p>
      )}
      {success && <p className="text-[12.5px] text-[var(--teal)] mt-3">Chave conectada com sucesso.</p>}
      <p className="text-xs text-[var(--text-3)] leading-relaxed mt-3">
        Sua chave é armazenada de forma criptografada e nunca é reexibida.
      </p>
      <div className="mt-4">
        <Btn variant="primary" disabled={wizard.savingKey || !apiKey.trim()} onClick={save}>
          <Icon name="key" /> {wizard.savingKey ? "Validando..." : "Salvar chave"}
        </Btn>
      </div>
    </div>
  );
}

export function AccountModal() {
  const wizard = useWizard();
  const open = wizard.modal.type === "account";
  const accountType = open && wizard.modal.type === "account" ? wizard.modal.accountType : "password";
  const meta = TITLES[accountType];

  return (
    <ModalShell open={open} onClose={wizard.closeModal} icon={meta.icon} title={meta.title}>
      {accountType === "password" && <PasswordForm />}
      {accountType === "report" && <ReportForm />}
      {accountType === "faq" && <FaqBody />}
      {accountType === "support" && <SupportBody />}
      {accountType === "apikey" && <ApiKeyForm />}
    </ModalShell>
  );
}
