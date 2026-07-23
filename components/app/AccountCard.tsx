"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";

export function AccountCard() {
  const wizard = useWizard();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(wizard.accountName);

  function commit() {
    const next = draft.trim() || wizard.accountName;
    wizard.setAccountName(next);
    setEditing(false);
  }

  return (
    <div className="w-[280px] max-[640px]:w-full shrink-0 bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-[14px] p-3.5">
      <div className="flex items-center gap-2.5 mb-3 pb-3 border-b-[0.5px] border-[var(--line)]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] flex items-center justify-center font-[var(--font-display)] font-bold text-[13px] text-[#12141A] shrink-0">
          {wizard.accountInitials()}
        </div>
        <div>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(wizard.accountName);
                  setEditing(false);
                }
              }}
              className="font-sans text-[13px] font-semibold text-[var(--text-1)] bg-[var(--bg-2)] border border-[var(--gold)] rounded px-1 py-0.5 w-full outline-none"
            />
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label="Clique para editar seu nome"
              onClick={() => {
                setDraft(wizard.accountName);
                setEditing(true);
              }}
              onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
              className="text-[13px] font-semibold text-[var(--text-1)] cursor-pointer rounded px-1 py-0.5 -mx-1 hover:bg-[var(--bg-2)]"
            >
              {wizard.accountName}
            </div>
          )}
          <div className={`font-mono text-[10.5px] mt-0.5 ${wizard.isSubscribed || wizard.accessPhase === "trial" ? "text-[var(--text-3)]" : "text-[var(--gold)]"}`}>
            {wizard.isSubscribed && "Assinatura ativa"}
            {!wizard.isSubscribed && wizard.accessPhase === "trial" &&
              `Teste grátis · ${wizard.phaseDaysLeft} ${wizard.phaseDaysLeft === 1 ? "dia restante" : "dias restantes"}`}
            {!wizard.isSubscribed && wizard.accessPhase === "free" &&
              `Modo limitado · ${wizard.phaseDaysLeft} ${wizard.phaseDaysLeft === 1 ? "dia restante" : "dias restantes"}`}
            {!wizard.isSubscribed && wizard.accessPhase === "locked" && "Acesso encerrado"}
          </div>
        </div>
      </div>
      {wizard.userEmail && (
        <div className="text-[11px] text-[var(--text-3)] mb-3 truncate" title={wizard.userEmail}>
          {wizard.userEmail}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <Link
          href="/app/provedores"
          className="flex items-center gap-2 bg-transparent border-none text-[var(--text-2)] text-xs font-sans px-1.5 py-2 rounded-lg cursor-pointer text-left w-full transition-all hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] [&_svg]:text-[var(--text-3)] hover:[&_svg]:text-[var(--gold)]"
        >
          <Icon name="key" className="text-sm shrink-0" /> Provedores de IA
        </Link>
        {[
          { icon: "lock", label: "Trocar senha", type: "password" as const },
          { icon: "alert-triangle", label: "Relatar problema", type: "report" as const },
          { icon: "help", label: "FAQ", type: "faq" as const },
          { icon: "message-bot", label: "Suporte por IA", type: "support" as const },
        ].map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => wizard.openModal({ type: "account", accountType: item.type })}
            className="flex items-center gap-2 bg-transparent border-none text-[var(--text-2)] text-xs font-sans px-1.5 py-2 rounded-lg cursor-pointer text-left w-full transition-all hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] [&_svg]:text-[var(--text-3)] hover:[&_svg]:text-[var(--gold)]"
          >
            <Icon name={item.icon} className="text-sm shrink-0" /> {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => wizard.signOut()}
          className="flex items-center gap-2 bg-transparent border-none text-[var(--text-2)] text-xs font-sans px-1.5 py-2 rounded-lg cursor-pointer text-left w-full transition-all hover:bg-[var(--bg-2)] hover:text-[var(--gold)] mt-1 pt-2 border-t-[0.5px] border-[var(--line)]"
        >
          <Icon name="logout" className="text-sm shrink-0" /> Sair
        </button>
      </div>
    </div>
  );
}
