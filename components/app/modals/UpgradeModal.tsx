"use client";

import { Icon } from "@/lib/icons";
import { KIWIFY_CHECKOUT_URL, TRIAL_DAYS } from "@/lib/plan";
import { useWizard } from "@/lib/wizard-context";
import { Btn, ModalShell } from "../ui";

export function UpgradeModal() {
  const wizard = useWizard();
  const open = wizard.modal.type === "upgrade";

  return (
    <ModalShell open={open} onClose={wizard.closeModal} icon="rocket" title="Assine para continuar">
      <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-6">
        Seus {TRIAL_DAYS} dias de teste grátis com uso irrestrito {wizard.trialActive ? "estão acabando" : "terminaram"}.
        Para continuar gerando roteiros, imagens, narração e vídeo, é preciso de uma assinatura ativa — não existe
        outro plano gratuito.
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
