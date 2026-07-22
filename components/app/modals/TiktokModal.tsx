"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { useDistribution } from "@/lib/distribution-context";
import { Btn, ModalShell } from "../ui";

type Step = "intro" | "connecting" | "done";

export function TiktokModal() {
  const wizard = useWizard();
  const distribution = useDistribution();
  const open = wizard.modal.type === "tiktok";
  const [step, setStep] = useState<Step>("intro");
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStep(distribution.tiktokConnected ? "done" : "intro");
  }

  return (
    <ModalShell open={open} onClose={wizard.closeModal} icon="brand-tiktok" title="Conectar conta TikTok">
      {step === "intro" && (
        <div>
          <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-5">
            Conecte sua conta pra publicar os vídeos direto do POSTime. Você autoriza uma vez e pode desconectar
            quando quiser.
          </p>
          <ul className="list-none p-0 mb-6 flex flex-col gap-3">
            <li className="flex items-center gap-2.5 text-[var(--text-2)] text-[13.5px]">
              <Icon name="share" className="text-[var(--teal)] text-base shrink-0" /> Share Kit: vídeo abre pronto no
              app do TikTok, você só confirma
            </li>
            <li className="flex items-center gap-2.5 text-[var(--text-2)] text-[13.5px]">
              <Icon name="bolt" className="text-[var(--teal)] text-base shrink-0" /> Publicação automática (Direct
              Post): em auditoria pelo TikTok, chega em breve
            </li>
          </ul>
          <Btn
            variant="primary"
            onClick={() => {
              setStep("connecting");
              setTimeout(() => {
                distribution.connectTiktok("@joseluiz.cruz");
                setStep("done");
              }, 1600);
            }}
          >
            <Icon name="brand-tiktok" /> Conectar com TikTok
          </Btn>
        </div>
      )}
      {step === "connecting" && (
        <div className="text-center">
          <Icon name="loader-2" spin className="text-[32px] text-[var(--gold)] block mb-3" />
          <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed">Conectando com sua conta TikTok...</p>
        </div>
      )}
      {step === "done" && (
        <div className="text-center">
          <Icon name="circle-check" className="text-[40px] text-[var(--teal)] block mb-3" />
          <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-6">
            Conta {distribution.tiktokHandle} conectada! Agora cada vídeo pronto tem um botão &quot;Publicar&quot; que abre
            direto no TikTok pra você confirmar.
          </p>
          <Btn variant="primary" onClick={wizard.closeModal}>
            Concluir
          </Btn>
        </div>
      )}
    </ModalShell>
  );
}
