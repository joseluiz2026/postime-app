"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useWizard, type StyleName } from "@/lib/wizard-context";
import { Btn, Card } from "@/components/app/ui";

const STYLES: { name: StyleName; desc: string; preview: React.ReactNode }[] = [
  {
    name: "Minimalista",
    desc: "Fundo limpo, texto grande centralizado",
    preview: (
      <>
        <rect width="44" height="78" fill="var(--bg-3)" />
        <rect x="10" y="34" width="24" height="3" rx="1.5" fill="var(--text-1)" />
        <rect x="15" y="41" width="14" height="2" rx="1" fill="var(--text-3)" />
      </>
    ),
  },
  {
    name: "Dinâmico",
    desc: "Zoom e transições rápidas, ritmo acelerado",
    preview: (
      <>
        <rect width="44" height="78" fill="var(--bg-3)" />
        <circle cx="22" cy="39" r="22" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.25" />
        <circle cx="22" cy="39" r="14" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.5" />
        <circle cx="22" cy="39" r="6" fill="var(--gold)" />
      </>
    ),
  },
  {
    name: "Cinematográfico",
    desc: "Barras pretas, tom sério, textos sutis",
    preview: (
      <>
        <rect width="44" height="78" fill="var(--bg-3)" />
        <rect x="0" y="0" width="44" height="12" fill="#0B0B0B" />
        <rect x="0" y="66" width="44" height="12" fill="#0B0B0B" />
        <rect x="14" y="36" width="16" height="10" rx="1" fill="var(--text-3)" opacity="0.5" />
        <rect x="14" y="70" width="16" height="2" rx="1" fill="var(--text-1)" />
      </>
    ),
  },
  {
    name: "Neon Bold",
    desc: "Cores vibrantes, tipografia grande",
    preview: (
      <>
        <defs>
          <linearGradient id="scNeonGrad" x1="0" y1="0" x2="44" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--gold)" />
            <stop offset="1" stopColor="var(--teal)" />
          </linearGradient>
        </defs>
        <rect width="44" height="78" fill="url(#scNeonGrad)" />
        <rect x="9" y="30" width="26" height="7" rx="1.5" fill="#0B0B0B" />
        <rect x="9" y="41" width="18" height="5" rx="1.5" fill="#0B0B0B" opacity="0.85" />
      </>
    ),
  },
  {
    name: "Kinetic Text",
    desc: "Texto animado, palavra por palavra",
    preview: (
      <>
        <rect width="44" height="78" fill="var(--bg-3)" />
        <rect x="8" y="27" width="20" height="4" rx="2" fill="var(--gold)" />
        <rect x="14" y="35" width="24" height="4" rx="2" fill="var(--teal)" />
        <rect x="6" y="43" width="16" height="4" rx="2" fill="var(--text-2)" />
      </>
    ),
  },
  {
    name: "Split Screen",
    desc: "Comparação lado a lado, tipo antes/depois",
    preview: (
      <>
        <rect width="44" height="78" fill="var(--bg-3)" />
        <rect x="0" y="0" width="44" height="37" fill="var(--gold)" opacity="0.35" />
        <rect x="0" y="41" width="44" height="37" fill="var(--teal)" opacity="0.35" />
        <rect x="0" y="37" width="44" height="4" fill="var(--bg-3)" />
        <rect x="14" y="16" width="16" height="3" rx="1.5" fill="var(--text-1)" />
        <rect x="14" y="58" width="16" height="3" rx="1.5" fill="var(--text-1)" />
      </>
    ),
  },
];

export default function EstiloPage() {
  const wizard = useWizard();
  const router = useRouter();
  const n = wizard.selectedForVideo.length;
  const [showWarning, setShowWarning] = useState(false);
  const [prevN, setPrevN] = useState(n);

  if (n !== prevN) {
    setPrevN(n);
    setShowWarning(false);
  }

  return (
    <Card>
      <h3 className="font-sans text-base font-semibold m-0 mb-1 text-[var(--text-1)]">Estilo visual do vídeo</h3>
      <p className="text-[13px] text-[var(--text-2)] m-0 mb-6 leading-relaxed">
        {n === 0
          ? "Volte à aba Gravação e marque na lista quais roteiros salvos entram no vídeo."
          : `${n} roteiro${n === 1 ? "" : "s"} selecionado${n === 1 ? "" : "s"} para montagem.`}
      </p>

      <div className="grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-2 max-[420px]:grid-cols-1">
        {STYLES.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => wizard.setSelectedStyle(s.name)}
            className={`flex flex-col items-start gap-2 text-left p-3.5 pb-4 border-[0.5px] rounded-xl bg-[var(--bg-2)] text-[var(--text-2)] cursor-pointer transition-all font-sans ${
              wizard.selectedStyle === s.name
                ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_6%,transparent)]"
                : "border-[var(--line)] hover:border-[var(--line-strong)]"
            }`}
          >
            <svg
              viewBox="0 0 44 78"
              width="44"
              height="78"
              aria-hidden="true"
              className={`rounded-md overflow-hidden shrink-0 border-[0.5px] ${
                wizard.selectedStyle === s.name ? "border-[var(--gold)]" : "border-[var(--line-strong)]"
              }`}
            >
              {s.preview}
            </svg>
            <span className="text-[13.5px] font-semibold text-[var(--text-1)]">{s.name}</span>
            <span className="text-[11.5px] text-[var(--text-3)] leading-snug">{s.desc}</span>
          </button>
        ))}
      </div>

      {showWarning && (
        <p className="text-[13px] text-[var(--text-2)] mt-3">
          <Icon name="alert-triangle" /> Selecione ao menos um roteiro salvo na aba Gravação antes de montar o vídeo.
        </p>
      )}

      <div className="mt-8">
        <Btn
          variant="primary"
          onClick={() => {
            const built = wizard.confirmBuild();
            if (built) router.push("/app/download");
            else setShowWarning(true);
          }}
        >
          Confirmar e montar vídeo <Icon name="arrow-right" />
        </Btn>
      </div>
    </Card>
  );
}
