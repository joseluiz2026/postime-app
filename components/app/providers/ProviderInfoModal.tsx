"use client";

import { Icon } from "@/lib/icons";
import type { ProviderInfo } from "@/lib/ai/providers";
import { Btn, ModalShell } from "../ui";

export function ProviderInfoModal({
  provider,
  open,
  onClose,
  onAlreadyHaveKey,
}: {
  provider: ProviderInfo;
  open: boolean;
  onClose: () => void;
  onAlreadyHaveKey: () => void;
}) {
  return (
    <ModalShell open={open} onClose={onClose} icon={provider.implemented ? "key" : "clock"} title={`Criar conta na ${provider.name}`}>
      <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed mb-4">{provider.description}</p>

      <div className="flex items-center gap-4 text-xs text-[var(--text-3)] mb-4">
        <span className="flex items-center gap-1">
          <Icon name="clock" /> Configuração: {provider.setupTime}
        </span>
        <span>Dificuldade: {provider.difficulty}</span>
      </div>

      {provider.notes && (
        <p className="text-[12.5px] text-[var(--gold)] leading-relaxed mb-4">
          <Icon name="alert-triangle" /> {provider.notes}
        </p>
      )}

      <div className="mb-5">
        <div className="text-xs font-medium text-[var(--text-2)] mb-2">Passo a passo</div>
        <ol className="list-none p-0 flex flex-col gap-2">
          {provider.steps.map((step, i) => (
            <li key={step} className="flex items-start gap-2.5 text-[13px] text-[var(--text-2)] leading-relaxed">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line-strong)] text-[11px] font-mono flex items-center justify-center text-[var(--text-2)]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2.5">
        <Btn
          variant="primary"
          className="w-full justify-center"
          onClick={() => window.open(provider.signupUrl, "_blank", "noopener,noreferrer")}
        >
          <Icon name="link" /> Abrir site oficial
        </Btn>
        {provider.implemented && (
          <Btn className="w-full justify-center" onClick={onAlreadyHaveKey}>
            <Icon name="key" /> Já tenho minha API
          </Btn>
        )}
        <Btn className="w-full justify-center" onClick={onClose}>
          Cancelar
        </Btn>
      </div>
    </ModalShell>
  );
}
