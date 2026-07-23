"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useWizard, type MusicMoodSelection, type SceneSeconds, type StyleName } from "@/lib/wizard-context";
import { Btn, Card, Dropzone, FieldLabel, HelpTip, Pill } from "@/components/app/ui";

const SCENE_SECONDS_OPTIONS: SceneSeconds[] = [1, 2, 3, 4, 5];

const MUSIC_MOOD_OPTIONS: { id: MusicMoodSelection; label: string }[] = [
  { id: "auto", label: "Automático" },
  { id: "motivacional", label: "Motivacional" },
  { id: "calmo", label: "Calmo" },
  { id: "corporativo", label: "Corporativo" },
  { id: "animado", label: "Animado" },
];

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
  const sortedSelected = [...wizard.selectedForVideo].sort((a, b) => a - b);
  const matched = wizard.matchedOwnImageIndices();
  const matchedTemas = wizard.selectedForVideo
    .map((i) => ({ i, img: wizard.matchedOwnImageForRoteiro(i) }))
    .filter((x): x is { i: number; img: NonNullable<typeof x.img> } => Boolean(x.img));

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

      {n > 0 && (
        <div className="mt-6 pt-6 border-t-[0.5px] border-[var(--line)]">
          <span className="block text-xs font-medium text-[var(--text-2)] mb-3">
            Cena e música por vídeo
            <HelpTip
              label="Como isso afeta cada vídeo"
              text={
                <>
                  <strong>Duração de cena:</strong> cada cena é uma foto — o app soma a duração da narração (ou da
                  legenda, se você pulou a gravação) com 6 segundos de folga e divide pelo tempo escolhido pra saber
                  quantas fotos entram. <strong>Música:</strong> no automático, o clima já vem definido pela IA pra
                  esse roteiro; escolhendo um clima aqui, só esse vídeo usa esse clima em vez do automático.
                </>
              }
            />
          </span>
          <div className="flex flex-col gap-2.5">
            {sortedSelected.map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 flex-wrap p-3 rounded-lg bg-[var(--bg-2)] border-[0.5px] border-[var(--line)]"
              >
                <span className="text-[12.5px] font-semibold text-[var(--text-1)] shrink-0 w-16">
                  Tema {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  {SCENE_SECONDS_OPTIONS.map((s) => (
                    <Pill
                      key={s}
                      selected={(wizard.sceneSecondsByTema[i] ?? 3) === s}
                      onClick={() => wizard.setSceneSecondsForTema(i, s)}
                    >
                      {s}s
                    </Pill>
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {MUSIC_MOOD_OPTIONS.map((m) => (
                    <Pill
                      key={m.id}
                      selected={(wizard.musicMoodByTema[i] ?? "auto") === m.id}
                      onClick={() => wizard.setMusicMoodForTema(i, m.id)}
                    >
                      {m.label}
                    </Pill>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t-[0.5px] border-[var(--line)]">
        <FieldLabel>
          Imagens próprias (opcional)
          <HelpTip
            label="Como funciona o encaixe automático"
            text={
              <>
                O nome do arquivo é usado pra encaixar a imagem automaticamente. Se o roteiro menciona &quot;praia de
                Copacabana&quot;, nomeie o arquivo como <strong>copacabana.jpg</strong> — o POSTime reconhece a
                palavra e usa essa foto como capa do vídeo desse tema, em vez de buscar uma genérica nos bancos
                gratuitos.
              </>
            }
          />
        </FieldLabel>
        <p className="text-[13px] text-[var(--text-2)] mb-4 leading-relaxed">
          Suas próprias fotos, de lugares, pessoas ou produtos citados no roteiro. <strong>Aviso:</strong> nomeie o
          arquivo com a mesma palavra citada no roteiro — é assim que ele vira a capa do vídeo certo.
        </p>
        <Dropzone
          icon="photo"
          title={wizard.ownImagesUploading ? "Enviando..." : "Clique para escolher ou arraste as imagens aqui"}
          subtitle="JPG, PNG ou WEBP · pode escolher várias · até 10MB cada"
          accept=".jpg,.jpeg,.png,.webp,image/*"
          multiple
          onFiles={(files) => wizard.addOwnImages(files)}
        />
        {wizard.ownImagesError && (
          <p className="text-[13px] text-[var(--gold)] mt-3">
            <Icon name="alert-triangle" /> {wizard.ownImagesError}
          </p>
        )}
        {wizard.ownImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {wizard.ownImages.map((img, idx) => (
              <div
                key={img.path}
                className={`flex items-center gap-2 bg-[var(--bg-2)] border-[0.5px] rounded-[9px] pl-1.5 pr-2 py-1.5 text-xs text-[var(--text-2)] max-w-[220px] ${
                  matched.has(idx) ? "border-[var(--teal)]" : "border-[var(--line)]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-7 h-7 object-cover rounded-md shrink-0" />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px]" title={img.name}>
                  {img.name}
                </span>
                {matched.has(idx) && (
                  <span className="text-[var(--teal)] text-[13px] shrink-0" title="Encaixado automaticamente no roteiro">
                    <Icon name="check" />
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Remover imagem"
                  onClick={() => wizard.removeOwnImage(idx)}
                  className="shrink-0 bg-transparent border-none text-[var(--text-3)] cursor-pointer text-sm leading-none flex hover:text-[var(--gold)]"
                >
                  <Icon name="minus" />
                </button>
              </div>
            ))}
          </div>
        )}
        {matchedTemas.length > 0 && (
          <div className="flex flex-col gap-1 mt-4">
            {matchedTemas.map(({ i, img }) => (
              <p key={i} className="text-[12.5px] text-[var(--teal)] m-0 flex items-center gap-1.5">
                <Icon name="check" /> Tema {String(i + 1).padStart(2, "0")} vai usar sua foto:{" "}
                <span className="font-mono">{img.name}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {showWarning && (
        <p className="text-[13px] text-[var(--text-2)] mt-3">
          <Icon name="alert-triangle" /> Selecione ao menos um roteiro salvo na aba Gravação antes de montar o vídeo.
        </p>
      )}

      {wizard.buildError && (
        <p className="text-[13px] text-[var(--gold)] mt-3">
          <Icon name="alert-triangle" /> {wizard.buildError}
        </p>
      )}

      <div className="mt-8">
        <Btn
          variant="primary"
          disabled={wizard.buildingVideos}
          onClick={async () => {
            if (wizard.selectedForVideo.length === 0) {
              setShowWarning(true);
              return;
            }
            const built = await wizard.confirmBuild();
            if (built) router.push("/app/download");
          }}
        >
          <Icon name={wizard.buildingVideos ? "loader-2" : "arrow-right"} spin={wizard.buildingVideos} />{" "}
          {wizard.buildingVideos ? "Montando vídeo..." : "Confirmar e montar vídeo"}
        </Btn>

        {wizard.buildingVideos && wizard.buildProgress && (
          <div className="mt-4 max-w-[360px]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[12px] text-[var(--text-2)]">
                {wizard.buildProgress.completed} de {wizard.buildProgress.total} vídeo
                {wizard.buildProgress.total === 1 ? "" : "s"} pronto
                {wizard.buildProgress.total === 1 ? "" : "s"}
              </span>
              <span className="text-[12px] font-mono text-[var(--text-2)]">
                {Math.round((wizard.buildProgress.completed / wizard.buildProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] overflow-hidden">
              <div
                className="h-full bg-[var(--gold)] transition-[width] duration-500 ease-out"
                style={{ width: `${(wizard.buildProgress.completed / wizard.buildProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
