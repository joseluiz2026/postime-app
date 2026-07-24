"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { Btn, ModalShell } from "../ui";

export function BuildFailedModal() {
  const wizard = useWizard();
  const router = useRouter();
  const open = wizard.modal.type === "buildFailed";
  const failedIndices = wizard.modal.type === "buildFailed" ? wizard.modal.failedIndices : [];
  const temaLabels = failedIndices.map((i) => `Tema ${String(i + 1).padStart(2, "0")}`).join(", ");

  return (
    <ModalShell open={open} onClose={wizard.closeModal} icon="alert-triangle" title="Um vídeo não foi entregue">
      <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-5">
        {failedIndices.length === 1
          ? `O vídeo do ${temaLabels} não foi entregue`
          : `Os vídeos de ${temaLabels} não foram entregues`}{" "}
        — pode ter sido uma falha temporária no processamento. Volte à aba Gravação: lá você encontra a opção
        &quot;Deseja regravar?&quot; no tema afetado para tentar de novo sem precisar gerar o texto de novo.
      </p>
      <div className="flex flex-col gap-2.5">
        <Btn
          variant="primary"
          className="w-full justify-center"
          onClick={() => {
            wizard.closeModal();
            router.push("/app/gravacao");
          }}
        >
          <Icon name="microphone" /> Ir para Gravação
        </Btn>
        <Btn className="w-full justify-center" onClick={wizard.closeModal}>
          Fechar
        </Btn>
      </div>
    </ModalShell>
  );
}
