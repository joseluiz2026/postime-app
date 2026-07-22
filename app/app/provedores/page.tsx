"use client";

import { Icon } from "@/lib/icons";
import { CATEGORY_META, providersByCategory, type ProviderCategory } from "@/lib/ai/providers";
import { useWizard } from "@/lib/wizard-context";
import { Card } from "@/components/app/ui";
import { ProviderCard } from "@/components/app/providers/ProviderCard";

const CATEGORY_ORDER: ProviderCategory[] = ["texto", "imagem", "video", "voz"];

const CATEGORY_BANNER: Partial<Record<ProviderCategory, string>> = {
  imagem:
    "Hoje o POSTime já busca fotos gratuitas automaticamente (Pexels) para as cenas do vídeo — nenhuma configuração é necessária. Os provedores abaixo são para o próximo passo: gerar imagens sob medida com IA.",
  video:
    "Hoje os vídeos são montados com o efeito Ken Burns (fotos + movimento de câmera), sem custo de IA. Os provedores abaixo entram no plano Pro, para gerar vídeo com IA de verdade.",
  voz: "A narração hoje é gravada ou enviada por você. A clonagem de voz com ElevenLabs já tem uma prévia no passo Roteiros (plano Pro) — a conexão real de chave por aqui chega em seguida.",
};

export default function ProvedoresPage() {
  const wizard = useWizard();

  return (
    <div>
      <Card>
        <h3 className="font-sans text-base font-semibold m-0 mb-1 text-[var(--text-1)] tracking-tight">
          Central de Provedores de IA
        </h3>
        <p className="text-[13px] text-[var(--text-2)] m-0 leading-relaxed">
          O POSTime orquestra vários provedores de IA — você escolhe com qual conta gerar seu conteúdo. Não sabe por
          onde começar? Os provedores com <strong className="text-[var(--text-1)]">⭐ Recomendado para iniciantes</strong>{" "}
          têm plano gratuito e configuração rápida.
        </p>
      </Card>

      {CATEGORY_ORDER.map((category) => {
        const meta = CATEGORY_META[category];
        const providers = providersByCategory(category);
        const banner = CATEGORY_BANNER[category];
        return (
          <Card key={category}>
            <div className="flex items-center gap-2.5 mb-1">
              <Icon name={meta.icon} className="text-lg text-[var(--gold)]" />
              <h4 className="font-sans text-[15px] font-semibold m-0 text-[var(--text-1)]">{meta.label}</h4>
            </div>
            <p className="text-xs text-[var(--text-3)] mb-4">{meta.description}</p>
            {banner && (
              <p className="text-[12.5px] text-[var(--text-2)] bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[10px] px-3.5 py-3 mb-4 leading-relaxed">
                <Icon name="help" /> {banner}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
              {providers.map((provider) => {
                const isConnected = category === "texto" && wizard.hasOwnKey && wizard.ownKeyProvider === provider.id;
                return (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    isConnected={isConnected}
                    saving={wizard.savingKey}
                    error={wizard.keyError}
                    onSave={
                      category === "texto"
                        ? (apiKey) => wizard.saveOwnKey(provider.id as Parameters<typeof wizard.saveOwnKey>[0], apiKey)
                        : undefined
                    }
                    onRemove={category === "texto" ? wizard.removeOwnKey : undefined}
                  />
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
