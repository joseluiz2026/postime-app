"use client";

import { Icon } from "@/lib/icons";
import { FREE_DAYS, KIWIFY_CHECKOUT_URL, TRIAL_DAYS } from "@/lib/plan";
import { useWizard } from "@/lib/wizard-context";
import { Btn, ModalShell } from "../ui";

export function UpgradeModal() {
  const wizard = useWizard();
  const open = wizard.modal.type === "upgrade";

  return (
    <ModalShell open={open} onClose={wizard.closeModal} icon="rocket" title="Assine para continuar">
      <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-6">
        {wizard.accessPhase === "locked"
          ? `Seus ${TRIAL_DAYS + FREE_DAYS} dias grátis acabaram.`
          : wizard.accessPhase === "free"
            ? "Você está no modo limitado (até 2 vídeos de 15s por dia) — isso passa do que esse modo permite."
            : "Você atingiu o limite de hoje, ou tentou um recurso que exige assinatura."}{" "}
        Para continuar sem limite, é preciso de uma assinatura ativa — não existe outro plano gratuito.
      </p>
      <div className="flex flex-col gap-2.5">
        <Btn
          variant="primary"
          className="w-full justify-center"
          onClick={() => window.open(KIWIFY_CHECKOUT_URL, "_blank", "noopener,noreferrer")}
        >
          <Icon name="crown" /> Assinar
        </Btn>
        <Btn className="w-full justify-center" onClick={wizard.closeModal}>
          Fechar
        </Btn>
      </div>
      <p className="text-[11.5px] text-[var(--text-3)] leading-relaxed mt-4">
        Depois de assinar, sua conta pode levar alguns minutos para ser liberada automaticamente.
      </p>
    </ModalShell>
  );
}
