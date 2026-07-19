"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { ModalShell } from "../ui";

const STEPS = [
  { key: "roteiros", label: "Gerando roteiros a partir da fonte" },
  { key: "imagens", label: "Buscando imagens nos bancos gratuitos" },
  { key: "narracao", label: "Narrando com sua voz" },
  { key: "montagem", label: "Montando os vídeos finais" },
];

export function AutoProgressModal() {
  const wizard = useWizard();
  const open = wizard.modal.type === "autoProgress";
  const onDone = open && wizard.modal.type === "autoProgress" ? wizard.modal.onDone : undefined;
  const [activeIndex, setActiveIndex] = useState(-1);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setActiveIndex(-1);
  }

  useEffect(() => {
    if (!open || !onDone) return;
    let i = 0;
    let cancelled = false;
    function tick() {
      if (cancelled) return;
      if (i < STEPS.length) {
        setActiveIndex(i);
        i++;
        setTimeout(tick, 900);
      } else {
        setTimeout(() => {
          if (!cancelled) onDone?.();
        }, 500);
      }
    }
    const startTimer = setTimeout(tick, 0);
    return () => {
      clearTimeout(startTimer);
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <ModalShell open={open} onClose={() => {}} closable={false} icon="bolt" title="Gerando automaticamente">
      <p className="text-[var(--text-2)] text-[13.5px] leading-relaxed mb-6">Senta e relaxa, a gente cuida do resto.</p>
      <ul className="list-none p-0 flex flex-col gap-4">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li
              key={step.key}
              className={`flex items-center gap-3 text-[13.5px] transition-colors ${
                done || active ? "text-[var(--text-1)]" : "text-[var(--text-3)]"
              }`}
            >
              <span
                className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-xs shrink-0 ${
                  done
                    ? "bg-[var(--teal)] border-[var(--teal)] text-[#1a1a1a]"
                    : active
                      ? "border-[var(--gold)] text-[var(--gold)]"
                      : "border-[var(--line-strong)] text-[var(--text-3)]"
                }`}
              >
                {done && <Icon name="check" />}
                {active && <Icon name="loader-2" spin />}
              </span>
              {step.label}
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}
