"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { FREE_DAYS, getKiwifyCheckoutUrl, TRIAL_DAYS } from "@/lib/plan";
import { useWizard } from "@/lib/wizard-context";
import { Btn, FieldLabel, ModalShell, TextInput } from "../ui";

type ReconcileStatus = "idle" | "loading" | "success" | "not_found" | "error";

export function UpgradeModal() {
  const wizard = useWizard();
  const open = wizard.modal.type === "upgrade";
  const [showReconcile, setShowReconcile] = useState(false);
  const [reconcileEmail, setReconcileEmail] = useState("");
  const [reconcileStatus, setReconcileStatus] = useState<ReconcileStatus>("idle");

  async function checkPayment() {
    if (!reconcileEmail.trim()) return;
    setReconcileStatus("loading");
    try {
      const res = await fetch("/api/account/link-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reconcileEmail.trim() }),
      });
      if (res.ok) {
        setReconcileStatus("success");
        await wizard.refreshUsage();
      } else if (res.status === 404) {
        setReconcileStatus("not_found");
      } else {
        setReconcileStatus("error");
      }
    } catch {
      setReconcileStatus("error");
    }
  }

  function handleClose() {
    setShowReconcile(false);
    setReconcileEmail("");
    setReconcileStatus("idle");
    wizard.closeModal();
  }

  return (
    <ModalShell open={open} onClose={handleClose} icon="rocket" title="Assine para continuar">
      <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-6">
        {wizard.accessPhase === "locked"
          ? `Seus ${TRIAL_DAYS + FREE_DAYS} dias grátis acabaram.`
          : wizard.accessPhase === "free"
            ? "Você está no modo limitado (até 2 vídeos de 15s por dia) — isso passa do que esse modo permite."
            : "Você atingiu o limite de hoje, ou tentou um recurso que exige assinatura."}{" "}
        Para continuar sem limite, é preciso de uma assinatura ativa — não existe outro plano gratuito.
      </p>

      {!showReconcile ? (
        <>
          <div className="flex flex-col gap-2.5">
            <Btn
              variant="primary"
              className="w-full justify-center"
              onClick={() =>
                window.open(
                  getKiwifyCheckoutUrl(wizard.userEmail, wizard.accountName),
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <Icon name="crown" /> Assinar
            </Btn>
            <Btn className="w-full justify-center" onClick={handleClose}>
              Fechar
            </Btn>
          </div>
          <p className="text-[11.5px] text-[var(--text-3)] leading-relaxed mt-4">
            Depois de assinar, sua conta pode levar alguns minutos para ser liberada automaticamente.{" "}
            <button
              className="text-[var(--gold)] underline-offset-2 hover:underline"
              onClick={() => setShowReconcile(true)}
            >
              Já paguei mas minha conta não foi liberada
            </button>
            .
          </p>
        </>
      ) : reconcileStatus === "success" ? (
        <div>
          <p className="text-[13.5px] text-[var(--teal)] leading-relaxed mb-4">
            <Icon name="circle-check" /> Encontramos seu pagamento e sua conta já está liberada.
          </p>
          <Btn variant="primary" className="w-full justify-center" onClick={handleClose}>
            Concluir
          </Btn>
        </div>
      ) : (
        <div>
          <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed mb-4">
            Informe o e-mail que você usou na hora de pagar na Kiwify (pode ser diferente do e-mail da sua conta
            POSTime).
          </p>
          <FieldLabel htmlFor="reconcileEmail">E-mail usado no pagamento</FieldLabel>
          <TextInput
            id="reconcileEmail"
            type="email"
            placeholder="voce@email.com"
            value={reconcileEmail}
            onChange={(e) => {
              setReconcileEmail(e.target.value);
              setReconcileStatus("idle");
            }}
          />
          {reconcileStatus === "not_found" && (
            <p className="text-[12.5px] text-[var(--gold)] mt-3">
              <Icon name="alert-triangle" /> Não encontramos esse pagamento ainda. Se você acabou de pagar, aguarde
              alguns minutos e tente de novo. Se persistir, use &quot;Relatar problema&quot; no menu da conta.
            </p>
          )}
          {reconcileStatus === "error" && (
            <p className="text-[12.5px] text-[var(--gold)] mt-3">
              <Icon name="alert-triangle" /> Não foi possível verificar agora. Tente de novo em instantes.
            </p>
          )}
          <div className="flex gap-2.5 mt-4">
            <Btn
              variant="primary"
              disabled={reconcileStatus === "loading" || !reconcileEmail.trim()}
              onClick={checkPayment}
            >
              <Icon name="check" /> {reconcileStatus === "loading" ? "Verificando..." : "Verificar"}
            </Btn>
            <Btn onClick={() => setShowReconcile(false)}>Voltar</Btn>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
