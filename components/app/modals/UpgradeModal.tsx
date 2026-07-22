"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import { FREE_LIFETIME_LIMIT } from "@/lib/plan";
import { useWizard } from "@/lib/wizard-context";
import { Btn, ModalShell } from "../ui";

export function UpgradeModal() {
  const wizard = useWizard();
  const router = useRouter();
  const open = wizard.modal.type === "upgrade";
  const auto = open && wizard.modal.type === "upgrade" ? wizard.modal.auto : false;

  if (auto) {
    return (
      <ModalShell open={open} onClose={wizard.closeModal} icon="key" title="Gere sem limite">
        <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-6">
          Suas {FREE_LIFETIME_LIMIT} gerações grátis acabaram. Conecte sua própria chave de API (OpenAI, Google
          Gemini ou Anthropic) para continuar gerando roteiros sem limite — o custo passa a ser seu.
        </p>
        <div className="flex flex-col gap-2.5">
          <Btn
            variant="primary"
            className="w-full justify-center"
            onClick={() => {
              wizard.closeModal();
              router.push("/app/provedores");
            }}
          >
            <Icon name="key" /> Adicionar minha chave de API
          </Btn>
          <Btn className="w-full justify-center" onClick={wizard.closeModal}>
            Fechar
          </Btn>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell open={open} onClose={wizard.closeModal} icon="rocket" title="Torne-se Pro">
      <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-6">
        Desbloqueie recursos exclusivos com o plano Pro. Para gerar roteiros sem limite hoje, conecte sua própria
        chave de API na &quot;Central de Provedores de IA&quot;.
      </p>
      <ul className="list-none p-0 mb-6 flex flex-col gap-3">
        {[
          { icon: "key", text: "Geração ilimitada, conectando sua própria chave de API" },
          { icon: "microphone", text: "Narração com sua voz clonada" },
        ].map((b) => (
          <li key={b.text} className="flex items-center gap-2.5 text-[var(--text-2)] text-[13.5px]">
            <Icon name={b.icon} className="text-[var(--teal)] text-base shrink-0" /> {b.text}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2.5">
        <Btn variant="primary" className="w-full justify-center" onClick={wizard.confirmUpgrade}>
          <Icon name="crown" /> Ativar Pro
        </Btn>
        <Btn className="w-full justify-center" onClick={wizard.closeModal}>
          Continuar no Free
        </Btn>
      </div>
    </ModalShell>
  );
}
