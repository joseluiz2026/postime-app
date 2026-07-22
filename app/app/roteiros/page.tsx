"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/lib/icons";
import { FREE_DAILY_VIDEOS, FREE_DAYS, TRIAL_DAILY_VIDEOS, TRIAL_DAYS } from "@/lib/plan";
import { PROVIDER_LABELS } from "@/lib/ai/generate-roteiros";
import { useWizard } from "@/lib/wizard-context";
import { Btn, Card, HelpTip, IconBtn, Pill, TextArea } from "@/components/app/ui";

export default function RoteirosPage() {
  const wizard = useWizard();
  const router = useRouter();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <Card>
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h3 className="font-sans text-base font-semibold m-0 text-[var(--text-1)]">Roteiros gerados</h3>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-xs px-3 py-1.5 rounded-full border-[0.5px] ${
              wizard.accessPhase === "trial"
                ? "text-[var(--teal)] bg-[color-mix(in_srgb,var(--teal)_8%,transparent)] border-[color-mix(in_srgb,var(--teal)_25%,transparent)]"
                : "text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] border-[color-mix(in_srgb,var(--gold)_30%,transparent)]"
            }`}
          >
            {wizard.accessPhase === "trial" &&
              `Teste grátis · ${wizard.phaseDaysLeft} ${wizard.phaseDaysLeft === 1 ? "dia restante" : "dias restantes"}`}
            {wizard.accessPhase === "free" &&
              `Modo limitado · ${wizard.phaseDaysLeft} ${wizard.phaseDaysLeft === 1 ? "dia restante" : "dias restantes"}`}
            {wizard.accessPhase === "locked" && "Acesso encerrado"}
          </span>
          <HelpTip
            label="Como funciona o teste grátis"
            text={`${TRIAL_DAYS} dias com até ${TRIAL_DAILY_VIDEOS} vídeos por dia, qualquer duração. Depois disso, mais ${FREE_DAYS} dias em modo limitado (até ${FREE_DAILY_VIDEOS} vídeos por dia, só 15s, sem clonagem de voz). Depois disso, é preciso de uma assinatura ativa para continuar — mesmo com chave própria conectada.`}
          />
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-2)] mt-3 leading-relaxed">
        Baseados nos temas extraídos da fonte. Escolha a duração e a quantidade antes de gravar.
        {wizard.sourceType !== "texto" && (
          <>
            {" "}
            <Icon name="alert-triangle" /> Hoje só o texto colado é lido de verdade pela IA — PDF, link e YouTube
            ainda servem só como indício de tema, não são extraídos.
          </>
        )}
      </p>

      <div className="flex items-end flex-wrap gap-8 mt-4">
        <div>
          <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Duração</span>
          <div className="flex gap-2">
            {(["15s", "30s", "60s"] as const).map((d) => {
              const allowed = wizard.allowedDurations.includes(d);
              return (
                <Pill
                  key={d}
                  selected={wizard.duration === d}
                  onClick={() => wizard.setDuration(d)}
                  disabled={!allowed}
                  title={allowed ? undefined : "Disponível só no teste grátis ou com assinatura"}
                  className={allowed ? "" : "opacity-40 cursor-not-allowed"}
                >
                  {d}
                </Pill>
              );
            })}
          </div>
        </div>
        <div>
          <span className="block text-xs font-medium text-[var(--text-2)] mb-2">
            Vídeos por vez
            <HelpTip
              label="O que significa vídeos por vez"
              text='Quantos roteiros o botão "Gerar" cria de uma vez.'
            />
          </span>
          <div className="flex items-center gap-2.5">
            <IconBtn aria-label="Diminuir quantidade" onClick={() => wizard.setQty(wizard.qty - 1)}>
              <Icon name="minus" />
            </IconBtn>
            <span className="w-11 text-center bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[9px] text-[var(--text-1)] font-mono text-sm py-1.5">
              {wizard.qty}
            </span>
            <IconBtn aria-label="Aumentar quantidade" onClick={() => wizard.setQty(wizard.qty + 1)}>
              <Icon name="plus" />
            </IconBtn>
            <Btn
              variant="primary"
              className="ml-2.5"
              onClick={wizard.clickGerar}
              disabled={wizard.generating || wizard.accessPhase === "locked"}
            >
              <Icon name="loader-2" spin={wizard.generating} className={wizard.generating ? "" : "hidden"} />
              <Icon name="bolt" className={wizard.generating ? "hidden" : ""} />
              {wizard.generating ? "Gerando..." : "Gerar"}
            </Btn>
          </div>
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-2)] mt-3 leading-relaxed">
        {wizard.accessPhase === "locked" ? (
          <>
            <Icon name="lock" /> Seu acesso grátis acabou.{" "}
            <button
              className="text-[var(--gold)] underline-offset-2 hover:underline"
              onClick={wizard.openUpgradeModal}
            >
              Assine para continuar
            </button>
            .
          </>
        ) : wizard.hasOwnKey ? (
          <>
            <Icon name="infinity" /> Usando sua própria chave ({PROVIDER_LABELS[wizard.ownKeyProvider!]}).
          </>
        ) : wizard.accessPhase === "free" ? (
          `Modo limitado: ${wizard.phaseDaysLeft} ${wizard.phaseDaysLeft === 1 ? "dia restante" : "dias restantes"} · até ${FREE_DAILY_VIDEOS} vídeos de 15s por dia.`
        ) : (
          `Teste grátis: ${wizard.phaseDaysLeft} ${wizard.phaseDaysLeft === 1 ? "dia restante" : "dias restantes"} · até ${TRIAL_DAILY_VIDEOS} vídeos por dia, qualquer duração.`
        )}
      </p>

      {wizard.generateError && (
        <p className="text-[13px] text-[var(--gold)] mt-2 leading-relaxed">
          <Icon name="alert-triangle" /> {wizard.generateError}
        </p>
      )}

      <div className="flex items-center gap-2.5 mt-3 flex-wrap">
        <Btn
          className={wizard.accessPhase !== "trial" ? "opacity-55 hover:opacity-75 hover:border-[var(--gold)] hover:text-[var(--gold)]" : ""}
          onClick={() => (wizard.accessPhase !== "trial" ? wizard.openUpgradeModal() : wizard.openModal({ type: "eleven" }))}
        >
          <Icon name="plug" /> Conectar minha voz (ElevenLabs)
        </Btn>
        <span className="text-[13px] text-[var(--text-2)]">
          {wizard.accessPhase !== "trial" ? (
            <>
              <Icon name="lock" /> Requer teste grátis ativo ou assinatura
            </>
          ) : wizard.voiceCloned ? (
            <>
              <Icon name="circle-check" className="text-[var(--teal)]" />{" "}
              {wizard.selectedVoiceName ? `Voz conectada: ${wizard.selectedVoiceName}` : "Voz clonada ativa"}
            </>
          ) : null}
        </span>
      </div>

      <div className="flex items-center gap-2.5 mt-2 flex-wrap">
        <Btn onClick={() => router.push("/app/provedores")}>
          <Icon name="key" /> Central de Provedores de IA
        </Btn>
        {wizard.hasOwnKey && (
          <span className="text-[13px] text-[var(--text-2)]">
            <Icon name="circle-check" className="text-[var(--teal)]" /> Chave conectada:{" "}
            {PROVIDER_LABELS[wizard.ownKeyProvider!]}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-6">
        {wizard.roteiros.map((r, idx) => (
          <div
            key={idx}
            className="border-[0.5px] border-[var(--line)] rounded-xl px-[18px] py-4 flex justify-between items-start gap-4 transition-colors hover:border-[var(--line-strong)] max-[640px]:flex-col"
          >
            <div className="flex-1">
              <div className="font-mono text-[11px] text-[var(--teal)] mb-2 tracking-wide">{r.meta}</div>
              {editingIndex === idx ? (
                <TextArea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="text-[13.5px] max-w-[500px]"
                />
              ) : (
                <div className="text-[13.5px] text-[var(--text-2)] leading-relaxed max-w-[500px]">{r.text}</div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0 max-[640px]:flex-row max-[640px]:flex-wrap max-[640px]:self-stretch max-[640px]:justify-end">
              {editingIndex === idx ? (
                <button
                  onClick={() => {
                    wizard.editRoteiroText(idx, draft);
                    setEditingIndex(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] font-medium rounded-[9px] border-[0.5px] border-[var(--line)] text-[var(--text-2)] bg-transparent cursor-pointer whitespace-nowrap transition-all hover:border-[var(--gold)] hover:text-[var(--gold)]"
                >
                  <Icon name="check" /> Salvar
                </button>
              ) : (
                <button
                  aria-label="Editar roteiro"
                  onClick={() => {
                    setEditingIndex(idx);
                    setDraft(r.text);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] font-medium rounded-[9px] border-[0.5px] border-[var(--line)] text-[var(--text-2)] bg-transparent cursor-pointer whitespace-nowrap transition-all hover:border-[var(--gold)] hover:text-[var(--gold)]"
                >
                  <Icon name="pencil" /> Editar
                </button>
              )}
              <button
                aria-label="Regenerar roteiro"
                onClick={() => wizard.regenerateRoteiro(idx)}
                disabled={wizard.regeneratingIndex === idx}
                className="flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] font-medium rounded-[9px] border-[0.5px] border-[var(--line)] text-[var(--text-2)] bg-transparent cursor-pointer whitespace-nowrap transition-all hover:border-[var(--teal)] hover:text-[var(--teal)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name={wizard.regeneratingIndex === idx ? "loader-2" : "sparkles"} spin={wizard.regeneratingIndex === idx} />{" "}
                {wizard.regeneratingIndex === idx ? "Regenerando..." : "Regenerar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex mt-4">
        <Btn variant="primary" className="ml-auto" onClick={() => router.push("/app/gravacao")}>
          Ir para gravação <Icon name="arrow-right" />
        </Btn>
      </div>
    </Card>
  );
}
