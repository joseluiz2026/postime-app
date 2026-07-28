"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { createClient } from "@/lib/supabase/client";
import { Btn, FieldLabel, ModalShell, TextArea, TextInput } from "../ui";

// TEMP (2026-07-28): liberado pro Free testar o suporte por IA. Voltar pra `false`
// (ou apagar essa flag) quando o teste acabar — reforça o gate real em app/api/support/chat.
const TEMP_SUPPORT_CHAT_OPEN_TO_ALL = true;

const TITLES: Record<string, { icon: string; title: string }> = {
  password: { icon: "lock", title: "Trocar senha" },
  report: { icon: "alert-triangle", title: "Relatar problema" },
  faq: { icon: "help", title: "Perguntas frequentes" },
  support: { icon: "message-bot", title: "Suporte por IA" },
};

const FAQ_ITEMS = [
  {
    q: "Quantos vídeos posso gerar no plano Free?",
    a: "18 gerações no total (não é por dia). Depois disso, conecte sua própria chave de API na \"Provedores de IA\" para continuar gerando sem limite.",
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

type SupportMessage = { role: "user" | "assistant"; content: string };

function SupportChat() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "invalid_key"
            ? 'Sua chave de IA conectada não é válida no momento — confira em "Provedores de IA".'
            : "Não foi possível responder agora. Tente de novo.",
        );
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {messages.length === 0 && (
        <p className="text-[13px] text-[var(--text-2)] leading-relaxed mb-3">
          Pergunte sobre planos, limites, gravação, estilos ou qualquer dúvida de como o POSTime funciona.
        </p>
      )}
      {messages.length > 0 && (
        <div ref={listRef} className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto mb-3 pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-[13px] leading-relaxed rounded-xl px-3.5 py-2.5 max-w-[85%] whitespace-pre-wrap ${
                m.role === "user"
                  ? "self-end bg-[var(--gold)] text-[#20200E]"
                  : "self-start bg-[var(--bg-2)] text-[var(--text-1)]"
              }`}
            >
              {m.content}
            </div>
          ))}
          {sending && (
            <div className="self-start text-[13px] text-[var(--text-3)] px-3.5 py-2.5">Digitando...</div>
          )}
        </div>
      )}
      {error && (
        <p className="text-[12.5px] text-[var(--text-2)] mb-3">
          <Icon name="alert-triangle" /> {error}
        </p>
      )}
      <div className="flex gap-2">
        <TextInput
          placeholder="Digite sua pergunta..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Btn variant="primary" disabled={sending || !input.trim()} onClick={send}>
          <Icon name="arrow-right" />
        </Btn>
      </div>
    </div>
  );
}

function SupportBody() {
  const wizard = useWizard();
  const router = useRouter();

  if (!wizard.isSubscribed && !TEMP_SUPPORT_CHAT_OPEN_TO_ALL) {
    return (
      <div>
        <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed mb-3">
          Um agente de IA que responde dúvidas sobre o POSTime na hora, 24h por dia.
        </p>
        <p className="text-[13px] text-[var(--gold)] leading-relaxed">
          <Icon name="lock" /> Somente para plano Pro.
        </p>
        <div className="mt-4">
          <Btn variant="primary" onClick={() => wizard.openUpgradeModal()}>
            <Icon name="crown" /> Assinar
          </Btn>
        </div>
      </div>
    );
  }

  if (!wizard.hasOwnKey) {
    return (
      <div>
        <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed mb-3">
          O suporte por IA usa a sua própria chave de IA — a mesma conectada em &quot;Provedores de IA&quot;.
        </p>
        <p className="text-[13px] text-[var(--text-2)] leading-relaxed">
          <Icon name="alert-triangle" /> Conecte uma chave de texto (Groq, Gemini, OpenAI ou Anthropic) pra liberar.
        </p>
        <div className="mt-4">
          <Btn
            variant="primary"
            onClick={() => {
              wizard.closeModal();
              router.push("/app/provedores");
            }}
          >
            <Icon name="key" /> Ir pra Provedores de IA
          </Btn>
        </div>
      </div>
    );
  }

  return <SupportChat />;
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
    </ModalShell>
  );
}
