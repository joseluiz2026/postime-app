"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { Btn, FieldLabel, ModalShell, TextArea, TextInput } from "../ui";

const TITLES: Record<string, { icon: string; title: string }> = {
  password: { icon: "lock", title: "Trocar senha" },
  report: { icon: "alert-triangle", title: "Relatar problema" },
  faq: { icon: "help", title: "Perguntas frequentes" },
  support: { icon: "message-bot", title: "Suporte por IA" },
};

const FAQ_ITEMS = [
  {
    q: "Quantos vídeos posso gerar no plano Free?",
    a: "3 por dia nos primeiros 3 dias, depois 2/dia, depois 1/dia, e bloqueia após 9 dias — faça upgrade pro Pro pra gerar sem limite.",
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
        <Btn
          variant="primary"
          onClick={() => {
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
            setSuccess(true);
          }}
        >
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
