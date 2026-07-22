"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { TIER_META, type ProviderInfo } from "@/lib/ai/providers";
import { Btn, FieldLabel, TextInput } from "../ui";
import { ProviderInfoModal } from "./ProviderInfoModal";

export function ProviderCard({
  provider,
  isConnected,
  saving,
  error,
  onSave,
  onRemove,
}: {
  provider: ProviderInfo;
  isConnected: boolean;
  saving: boolean;
  error: string | null;
  onSave?: (apiKey: string) => Promise<boolean>;
  onRemove?: () => Promise<void>;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (!onSave || !apiKey.trim()) return;
    setSuccess(false);
    const ok = await onSave(apiKey.trim());
    if (ok) {
      setApiKey("");
      setFormOpen(false);
      setSuccess(true);
    }
  }

  return (
    <div className="relative border-[0.5px] border-[var(--line)] rounded-xl p-4 flex flex-col">
      {provider.recommended && (
        <span className="absolute -top-2.5 right-3 text-[10.5px] font-medium bg-[var(--gold)] text-[#20200E] rounded-full px-2.5 py-1">
          ⭐ Recomendado para iniciantes
        </span>
      )}

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-[13.5px] font-semibold text-[var(--text-1)]">{provider.name}</div>
        {!provider.implemented && (
          <span className="shrink-0 font-mono text-[10.5px] text-[var(--text-3)] border-[0.5px] border-[var(--line-strong)] rounded-full px-2 py-0.5">
            Em breve
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--text-3)] leading-relaxed mb-3">{provider.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {provider.tiers.map((t) => (
          <span
            key={t}
            className="font-mono text-[10.5px] text-[var(--teal)] bg-[color-mix(in_srgb,var(--teal)_8%,transparent)] border-[0.5px] border-[color-mix(in_srgb,var(--teal)_25%,transparent)] rounded-full px-2 py-0.5"
          >
            ✔ {TIER_META[t].label}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-[var(--text-3)] mb-3">
        <span>Configuração: {provider.difficulty}</span>
        <span>·</span>
        <span>{provider.setupTime}</span>
      </div>

      {provider.notes && !formOpen && (
        <p className="text-[11.5px] text-[var(--text-3)] leading-relaxed mb-3">{provider.notes}</p>
      )}

      <div className="mt-auto pt-1">
        {isConnected ? (
          <div>
            <p className="text-[12.5px] text-[var(--teal)] leading-relaxed mb-2.5">
              <Icon name="circle-check" /> API conectada
              {provider.modelLabel && (
                <>
                  {" "}
                  · Modelo: <strong className="text-[var(--text-1)]">{provider.modelLabel}</strong>
                </>
              )}
            </p>
            <Btn disabled={saving} onClick={onRemove}>
              <Icon name="alert-triangle" /> Remover chave
            </Btn>
          </div>
        ) : formOpen ? (
          <div>
            <FieldLabel htmlFor={`key-${provider.id}`}>Chave de API da {provider.name}</FieldLabel>
            <TextInput
              id={`key-${provider.id}`}
              type="password"
              placeholder="Cole sua chave aqui"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoFocus
            />
            {error && (
              <p className="text-[11.5px] text-[var(--gold)] mt-2">
                <Icon name="alert-triangle" /> {error}
              </p>
            )}
            <div className="flex gap-1.5 mt-2.5">
              <Btn variant="primary" disabled={saving || !apiKey.trim()} onClick={handleSave}>
                <Icon name="key" /> {saving ? "Validando..." : "Salvar chave"}
              </Btn>
              <Btn onClick={() => setFormOpen(false)}>Cancelar</Btn>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <Btn onClick={() => setInfoOpen(true)}>
              <Icon name="rocket" /> Criar conta
            </Btn>
            <Btn onClick={() => setInfoOpen(true)}>
              <Icon name="help" /> Como obter API
            </Btn>
            {provider.implemented ? (
              <Btn variant="primary" onClick={() => setFormOpen(true)}>
                <Icon name="key" /> Conectar API
              </Btn>
            ) : (
              <Btn disabled>
                <Icon name="clock" /> Em breve
              </Btn>
            )}
          </div>
        )}
      </div>

      {success && !formOpen && (
        <p className="text-[11.5px] text-[var(--teal)] mt-2">Chave conectada com sucesso.</p>
      )}

      <ProviderInfoModal
        provider={provider}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        onAlreadyHaveKey={() => {
          setInfoOpen(false);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
