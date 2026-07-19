"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { Btn, FieldLabel, ModalShell, TextInput } from "../ui";

function formatPhone(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length > 6) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return digits;
}

export function WhatsappModal() {
  const wizard = useWizard();
  const open = wizard.modal.type === "whatsapp";
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);

  return (
    <ModalShell open={open} onClose={wizard.closeModal} icon="brand-whatsapp" title="Seu primeiro vídeo está pronto! 🎉">
      <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-5">
        Deixa seu WhatsApp pra gente te avisar quando seus dias grátis estiverem acabando, e te ajudar a continuar
        desfrutando do POSTime sem perder o ritmo.
      </p>
      <FieldLabel htmlFor="whatsappInput">WhatsApp (opcional)</FieldLabel>
      <TextInput
        id="whatsappInput"
        placeholder="(27) 99999-9999"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
      />
      <label className="flex items-start gap-2 mt-3 text-[12.5px] text-[var(--text-3)] cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        Aceito receber lembretes e novidades do POSTime por WhatsApp.
      </label>
      <div className="flex flex-col gap-2.5 mt-4">
        <Btn variant="primary" className="w-full justify-center" onClick={wizard.saveWhatsapp}>
          <Icon name="check" /> Salvar
        </Btn>
        <Btn variant="ghost" className="w-full justify-center" onClick={wizard.closeModal}>
          Agora não
        </Btn>
      </div>
    </ModalShell>
  );
}
