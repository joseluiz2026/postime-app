"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { Btn, Card, HelpTip, IconBtn, Pill, TextArea } from "@/components/app/ui";

export default function RoteirosPage() {
  const wizard = useWizard();
  const router = useRouter();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const limit = wizard.freeLimit();
  const remaining = Math.max(0, limit - wizard.dailyGenerated);

  return (
    <Card>
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h3 className="font-sans text-base font-semibold m-0 text-[var(--text-1)]">Roteiros gerados</h3>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--text-2)]">Plano:</span>
          <Pill selected={wizard.plan === "free"} onClick={() => wizard.setPlan("free")}>
            Free
          </Pill>
          <Pill selected={wizard.plan === "pro"} onClick={() => wizard.setPlan("pro")}>
            Pro
          </Pill>
          <HelpTip
            label="Diferença entre Free e Pro"
            text={
              <>
                <strong>Free:</strong> 3 vídeos/dia nos primeiros 3 dias, depois 2/dia (dias 4-6), depois 1/dia (dias
                7-9), e bloqueia depois disso. <strong>Pro:</strong> sem limite, com voz clonada e publicação
                automática no TikTok.
              </>
            }
          />
        </div>
      </div>

      {wizard.plan === "free" && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[13px] text-[var(--text-2)]">Simular:</span>
          <IconBtn aria-label="Diminuir dia simulado" onClick={() => wizard.bumpFreeDay(-1)}>
            <Icon name="minus" />
          </IconBtn>
          <span className="text-[13px] text-[var(--text-2)] font-mono">
            Dia {wizard.freeDay} · {limit === 0 ? "bloqueado" : `${limit} vídeo${limit === 1 ? "" : "s"}/dia`}
          </span>
          <IconBtn aria-label="Aumentar dia simulado" onClick={() => wizard.bumpFreeDay(1)}>
            <Icon name="plus" />
          </IconBtn>
          <HelpTip
            label="O que é isso"
            text="Simulador só pra teste do protótipo — na versão real, o dia avança sozinho com o calendário, contando a partir do cadastro do usuário."
          />
        </div>
      )}

      <p className="text-[13px] text-[var(--text-2)] mt-3 leading-relaxed">
        Baseados nos temas extraídos da fonte. Escolha a duração e a quantidade antes de gravar.
      </p>

      <div className="flex items-end flex-wrap gap-8 mt-4">
        <div>
          <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Duração</span>
          <div className="flex gap-2">
            {(["15s", "30s", "60s"] as const).map((d) => (
              <Pill key={d} selected={wizard.duration === d} onClick={() => wizard.setDuration(d)}>
                {d}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <span className="block text-xs font-medium text-[var(--text-2)] mb-2">
            Vídeos por vez
            <HelpTip
              label="O que significa vídeos por vez"
              text='Quantos roteiros o botão "Gerar" cria de uma vez. No plano Free, isso é limitado ao seu saldo diário restante (até 3 no total por dia).'
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
            <Btn variant="primary" className="ml-2.5" onClick={wizard.clickGerar} disabled={wizard.plan === "free" && limit === 0}>
              <Icon name="bolt" /> Gerar
            </Btn>
          </div>
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-2)] mt-3 leading-relaxed">
        {wizard.plan === "pro" ? (
          <>
            <Icon name="infinity" /> Plano Pro: gere quantos vídeos quiser, sem limite diário.
          </>
        ) : limit === 0 ? (
          <>
            <Icon name="lock" /> Seu período Free acabou (21 dias).{" "}
            <button className="text-[var(--gold)] underline-offset-2 hover:underline" onClick={wizard.requestPro}>
              Fazer upgrade para o Pro
            </button>{" "}
            para continuar gerando.
          </>
        ) : remaining > 0 ? (
          `Plano Free: ${remaining} de ${limit} vídeos disponíveis hoje.`
        ) : (
          <>
            <Icon name="lock" /> Limite diário do plano Free atingido ({limit} vídeo{limit === 1 ? "" : "s"}).{" "}
            <button className="text-[var(--gold)] underline-offset-2 hover:underline" onClick={wizard.requestPro}>
              Fazer upgrade para o Pro
            </button>{" "}
            para gerar sem limite.
          </>
        )}
      </p>

      <div className="flex items-center gap-2.5 mt-3">
        <Btn
          className={wizard.plan !== "pro" ? "opacity-55 hover:opacity-75 hover:border-[var(--gold)] hover:text-[var(--gold)]" : ""}
          onClick={() => (wizard.plan !== "pro" ? wizard.requestPro() : wizard.openModal({ type: "eleven" }))}
        >
          <Icon name="plug" /> Conectar minha voz (ElevenLabs)
        </Btn>
        <span className="text-[13px] text-[var(--text-2)]">
          {wizard.plan !== "pro" ? (
            <>
              <Icon name="lock" /> Disponível no plano Pro
            </>
          ) : wizard.voiceCloned ? (
            <>
              <Icon name="circle-check" className="text-[var(--teal)]" />{" "}
              {wizard.selectedVoiceName ? `Voz conectada: ${wizard.selectedVoiceName}` : "Voz clonada ativa"}
            </>
          ) : null}
        </span>
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
                className="flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] font-medium rounded-[9px] border-[0.5px] border-[var(--line)] text-[var(--text-2)] bg-transparent cursor-pointer whitespace-nowrap transition-all hover:border-[var(--teal)] hover:text-[var(--teal)]"
              >
                <Icon name="sparkles" /> Regenerar
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
