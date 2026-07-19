"use client";

import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { Btn, ModalShell } from "../ui";

export function UpgradeModal() {
  const wizard = useWizard();
  const open = wizard.modal.type === "upgrade";
  const auto = open && wizard.modal.type === "upgrade" ? wizard.modal.auto : false;

  return (
    <ModalShell open={open} onClose={wizard.closeModal} icon="rocket" title="Torne-se Pro">
      <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-6">
        {auto
          ? "Seu limite diário do plano Free acabou. Assine o Pro e continue gerando sem parar."
          : "Desbloqueie geração ilimitada de vídeos e recursos exclusivos com o plano Pro."}
      </p>
      <ul className="list-none p-0 mb-6 flex flex-col gap-3">
        {[
          { icon: "infinity", text: "Vídeos ilimitados por vez, todos os dias" },
          { icon: "bolt", text: "Geração prioritária, sem fila de espera" },
          { icon: "microphone", text: "Narração com sua voz clonada em todos os vídeos" },
          { icon: "download", text: "Exportação em lote de todos os roteiros do dia" },
        ].map((b) => (
          <li key={b.text} className="flex items-center gap-2.5 text-[var(--text-2)] text-[13.5px]">
            <Icon name={b.icon} className="text-[var(--teal)] text-base shrink-0" /> {b.text}
          </li>
        ))}
      </ul>
      <p className="font-mono text-xs text-[var(--text-3)] mb-4">A partir de R$ 49,90/mês · cancele quando quiser</p>
      <div className="flex flex-col gap-2.5">
        <Btn variant="primary" className="w-full justify-center" onClick={wizard.confirmUpgrade}>
          <Icon name="crown" /> Assinar o Pro
        </Btn>
        <Btn className="w-full justify-center" onClick={wizard.closeModal}>
          Continuar no Free
        </Btn>
      </div>
    </ModalShell>
  );
}
