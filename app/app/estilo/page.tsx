"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { IMAGE_THEMES } from "@/lib/images/themes";
import {
  useWizard,
  type CaptionBackground,
  type CaptionColor,
  type CaptionFont,
  type CaptionSize,
  type MusicMoodSelection,
  type SceneSeconds,
  type StyleName,
  type TextAlign,
  type TextOverlayCue,
  type WatermarkPosition,
} from "@/lib/wizard-context";
import { Btn, Card, Dropzone, FieldLabel, HelpTip, Pill, TextInput } from "@/components/app/ui";

const SCENE_SECONDS_OPTIONS: SceneSeconds[] = [1, 2, 3, 4, 5];

const WATERMARK_POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: "top-left", label: "Cima esquerda" },
  { id: "top-right", label: "Cima direita" },
  { id: "bottom-left", label: "Baixo esquerda" },
  { id: "bottom-right", label: "Baixo direita" },
];

const MUSIC_MOOD_OPTIONS: { id: MusicMoodSelection; label: string }[] = [
  { id: "auto", label: "Automático" },
  { id: "motivacional", label: "Motivacional" },
  { id: "calmo", label: "Calmo" },
  { id: "corporativo", label: "Corporativo" },
  { id: "animado", label: "Animado" },
];

const IMAGE_THEME_OPTIONS = IMAGE_THEMES.map((t) => ({ id: t.id, label: t.label }));

/**
 * Per-video photo assignment: shows every image segment that tema's render will
 * build (derived from narration duration ÷ segundos por cena) and lets the user
 * assign one of their uploaded photos to any slot. The app infers the mode from
 * the count alone — 0 assigned stays fully automatic, assigned ≥ needed uses only
 * own photos, anything in between fills the gaps with free stock — no separate
 * mode toggle needed.
 */
function TemaPhotoPanel({ temaIndex }: { temaIndex: number }) {
  const wizard = useWizard();
  const [open, setOpen] = useState(false);
  const needed = wizard.neededSegmentsForTema(temaIndex);
  const texts = wizard.segmentTextsForTema(temaIndex);
  const assignments = wizard.imageAssignmentsByTema[temaIndex] ?? [];
  const assignedCount = Array.from({ length: needed }, (_, k) => assignments[k]).filter(Boolean).length;

  let statusLabel: string;
  let statusClass: string;
  if (assignedCount === 0) {
    statusLabel = "Automático · bancos gratuitos";
    statusClass = "text-[var(--text-3)]";
  } else if (assignedCount >= needed) {
    statusLabel = "Só seu material";
    statusClass = "text-[var(--teal)]";
  } else {
    statusLabel = `${assignedCount} de ${needed} suas · resto automático`;
    statusClass = "text-[var(--gold)]";
  }

  return (
    <div className="rounded-lg bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3 text-left bg-transparent border-none cursor-pointer"
      >
        <span className="text-[12.5px] font-semibold text-[var(--text-1)] shrink-0 w-16">
          Tema {String(temaIndex + 1).padStart(2, "0")}
        </span>
        <span className="text-[11.5px] text-[var(--text-3)] shrink-0">
          {needed} {needed === 1 ? "imagem" : "imagens"} necessária{needed === 1 ? "" : "s"}
        </span>
        <span className={`text-[11.5px] ml-auto shrink-0 ${statusClass}`}>{statusLabel}</span>
        <Icon
          name="chevron-right"
          className={`text-[var(--text-3)] shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t-[0.5px] border-[var(--line)] p-3 flex flex-col gap-2">
          {texts.map((snippet, k) => (
            <div key={k} className="flex items-center gap-2.5">
              <span className="text-[10.5px] font-mono text-[var(--text-3)] w-5 shrink-0">
                {String(k + 1).padStart(2, "0")}
              </span>
              <span
                className="text-[12px] text-[var(--text-2)] flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                title={snippet}
              >
                {snippet}
              </span>
              <select
                value={assignments[k] ?? ""}
                onChange={(e) => wizard.setImageAssignment(temaIndex, k, e.target.value || null)}
                className="shrink-0 max-w-[170px] bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-[7px] text-[11.5px] text-[var(--text-1)] px-2 py-1.5 outline-none cursor-pointer hover:border-[var(--line-strong)] focus:border-[var(--gold)]"
              >
                <option value="">Automático</option>
                {wizard.ownImages.length > 0 && (
                  <optgroup label="Fotos">
                    {wizard.ownImages.map((img) => (
                      <option key={img.path} value={img.url}>
                        {img.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {wizard.ownVideoClips.length > 0 && (
                  <optgroup label="Vídeos">
                    {wizard.ownVideoClips.map((clip) => (
                      <option key={clip.path} value={clip.url}>
                        {clip.name} ({clip.durationSeconds}s)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          ))}
          {wizard.ownImages.length > 0 && (
            <div className="mt-3 pt-3 border-t-[0.5px] border-[var(--line)] flex items-center gap-2">
              <button
                type="button"
                onClick={() => wizard.assignOwnImagesInOrder(temaIndex)}
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg border-[0.5px] border-[var(--line-strong)] text-[var(--text-1)] bg-transparent cursor-pointer hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                <Icon name="repeat" /> Usar minhas fotos em ordem
              </button>
              <HelpTip
                label="Como funciona"
                text="Preenche todas as cenas deste vídeo com suas fotos, uma por cena, na ordem numérica/alfabética do nome do arquivo (ex.: foto_01, foto_02...). Se tiver menos fotos que cenas, o resto continua automático com banco de imagens."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A per-tema list of optional, timed título/subtítulo cues — add as many or
 * as few as wanted (facultativo), each with its own text and start time. */
function CueListEditor({
  label,
  cues,
  onAdd,
  onUpdate,
  onRemove,
}: {
  label: string;
  cues: TextOverlayCue[];
  onAdd: () => void;
  onUpdate: (cueId: string, patch: Partial<Pick<TextOverlayCue, "text" | "start" | "end">>) => void;
  onRemove: (cueId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[var(--text-2)]">{label}</span>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-[12px] font-medium text-[var(--teal)] bg-transparent border-[0.5px] border-[var(--teal)] rounded-[7px] cursor-pointer px-2.5 py-1 hover:bg-[color-mix(in_srgb,var(--teal)_10%,transparent)]"
        >
          <Icon name="plus" />
          Adicionar {label.toLowerCase()}
        </button>
      </div>
      {cues.length === 0 && (
        <p className="text-[11.5px] text-[var(--text-3)] italic">Nenhum {label.toLowerCase()} — opcional.</p>
      )}
      {cues.map((cue) => (
        <div key={cue.id} className="flex items-center gap-2">
          <TextInput
            value={cue.text}
            onChange={(e) => onUpdate(cue.id, { text: e.target.value })}
            placeholder={`Texto do ${label.toLowerCase()}`}
            maxLength={200}
            className="flex-1 !py-2 !text-[12.5px]"
          />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10.5px] text-[var(--text-3)]">de</span>
            <input
              type="number"
              min={0}
              value={cue.start}
              onChange={(e) => {
                const start = Math.max(0, Number(e.target.value) || 0);
                onUpdate(cue.id, { start, end: Math.max(cue.end, start + 0.5) });
              }}
              className="w-14 bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-[7px] text-[11.5px] text-[var(--text-1)] px-2 py-1.5 outline-none hover:border-[var(--line-strong)] focus:border-[var(--gold)]"
            />
            <span className="text-[10.5px] text-[var(--text-3)]">até</span>
            <input
              type="number"
              min={cue.start + 0.5}
              value={cue.end}
              onChange={(e) => onUpdate(cue.id, { end: Math.max(cue.start + 0.5, Number(e.target.value) || cue.start + 0.5) })}
              className="w-14 bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-[7px] text-[11.5px] text-[var(--text-1)] px-2 py-1.5 outline-none hover:border-[var(--line-strong)] focus:border-[var(--gold)]"
            />
            <span className="text-[10.5px] text-[var(--text-3)]">s</span>
          </div>
          <button
            type="button"
            aria-label={`Remover ${label.toLowerCase()}`}
            onClick={() => onRemove(cue.id)}
            className="shrink-0 bg-transparent border-none text-[var(--text-3)] cursor-pointer text-sm leading-none flex hover:text-[var(--gold)]"
          >
            <Icon name="minus" />
          </button>
        </div>
      ))}
    </div>
  );
}

const CAPTION_COLOR_OPTIONS: { id: CaptionColor; label: string; swatch: string }[] = [
  { id: "auto", label: "Automático", swatch: "" },
  { id: "white", label: "Branco", swatch: "#ffffff" },
  { id: "black", label: "Preto", swatch: "#0b0b0b" },
  { id: "yellow", label: "Amarelo", swatch: "#facc15" },
  { id: "red", label: "Vermelho", swatch: "#ef4444" },
  { id: "green", label: "Verde", swatch: "#22c55e" },
  { id: "blue", label: "Azul", swatch: "#3b82f6" },
  { id: "purple", label: "Roxo", swatch: "#a855f7" },
];

const CAPTION_BACKGROUND_OPTIONS: { id: CaptionBackground; label: string; swatch: string }[] = [
  { id: "auto", label: "Automático", swatch: "" },
  { id: "none", label: "Nenhum", swatch: "" },
  { id: "white", label: "Branco", swatch: "#ffffff" },
  { id: "black", label: "Preto", swatch: "#0b0b0b" },
  { id: "yellow", label: "Amarelo", swatch: "#facc15" },
  { id: "red", label: "Vermelho", swatch: "#ef4444" },
  { id: "green", label: "Verde", swatch: "#22c55e" },
  { id: "blue", label: "Azul", swatch: "#3b82f6" },
  { id: "purple", label: "Roxo", swatch: "#a855f7" },
];

const CAPTION_SIZE_OPTIONS: { id: CaptionSize; label: string }[] = [
  { id: "small", label: "Pequena" },
  { id: "medium", label: "Média" },
  { id: "large", label: "Grande" },
];

const CAPTION_FONT_OPTIONS: { id: CaptionFont; label: string }[] = [
  { id: "poppins", label: "Arredondada" },
  { id: "anton", label: "Impacto" },
  { id: "archivoblack", label: "Moderna" },
];

const TEXT_ALIGN_OPTIONS: { id: TextAlign; label: string }[] = [
  { id: "left", label: "Esquerda" },
  { id: "center", label: "Centro" },
  { id: "right", label: "Direita" },
];

/** Shared style controls for the Título/Subtítulo overlays — same control set
 * (align/color/size/font/shadow) is repeated once per overlay, each with its
 * own independent settings, so this stays a small parameterized block instead
 * of duplicating five pill rows twice. */
function OverlayStyleControls({
  align,
  onAlign,
  color,
  onColor,
  size,
  onSize,
  font,
  onFont,
  shadow,
  onShadow,
}: {
  align: TextAlign;
  onAlign: (a: TextAlign) => void;
  color: CaptionColor;
  onColor: (c: CaptionColor) => void;
  size: CaptionSize;
  onSize: (s: CaptionSize) => void;
  font: CaptionFont;
  onFont: (f: CaptionFont) => void;
  shadow: boolean;
  onShadow: (v: boolean) => void;
}) {
  return (
    <>
      <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Alinhamento</span>
      <div className="flex gap-2 mb-4">
        {TEXT_ALIGN_OPTIONS.map((a) => (
          <Pill key={a.id} selected={align === a.id} onClick={() => onAlign(a.id)}>
            {a.label}
          </Pill>
        ))}
      </div>
      <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Cor</span>
      <div className="flex gap-2 flex-wrap mb-4">
        {CAPTION_COLOR_OPTIONS.map((c) => (
          <Pill
            key={c.id}
            selected={color === c.id}
            onClick={() => onColor(c.id)}
            className="flex items-center gap-1.5"
          >
            {c.swatch && (
              <span
                className="w-2.5 h-2.5 rounded-full border-[0.5px] border-[var(--line-strong)] shrink-0"
                style={{ background: c.swatch }}
              />
            )}
            {c.label}
          </Pill>
        ))}
      </div>
      <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Tamanho</span>
      <div className="flex gap-2 mb-4">
        {CAPTION_SIZE_OPTIONS.map((s) => (
          <Pill key={s.id} selected={size === s.id} onClick={() => onSize(s.id)}>
            {s.label}
          </Pill>
        ))}
      </div>
      <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Fonte</span>
      <div className="flex gap-2 mb-4">
        {CAPTION_FONT_OPTIONS.map((f) => (
          <Pill key={f.id} selected={font === f.id} onClick={() => onFont(f.id)}>
            {f.label}
          </Pill>
        ))}
      </div>
      <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Sombra</span>
      <div className="flex gap-2">
        <Pill selected={shadow} onClick={() => onShadow(true)}>
          Ativada
        </Pill>
        <Pill selected={!shadow} onClick={() => onShadow(false)}>
          Desativada
        </Pill>
      </div>
    </>
  );
}

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

/**
 * Real progress only ticks in whole-video steps (0/3, 1/3, ...), which can sit
 * frozen for the 10-60s a single render takes. This eases the displayed percent
 * toward (but never reaching) the next step so the bar keeps visibly moving
 * while a video is still processing, then snaps forward for real once it lands.
 */
function useSmoothBuildProgress(active: boolean, completed: number, total: number) {
  const [pct, setPct] = useState(0);
  const sliceStartRef = useRef(0);
  const prevCompletedRef = useRef(completed);
  const prevActiveRef = useRef(active);

  useEffect(() => {
    const justStarted = active && !prevActiveRef.current;
    const completedChanged = completed !== prevCompletedRef.current;
    if (justStarted || completedChanged) sliceStartRef.current = Date.now();
    prevActiveRef.current = active;
    prevCompletedRef.current = completed;

    if (!active || total === 0) {
      const raf = requestAnimationFrame(() => setPct(0));
      return () => cancelAnimationFrame(raf);
    }
    if (completed >= total) {
      const raf = requestAnimationFrame(() => setPct(100));
      return () => cancelAnimationFrame(raf);
    }

    let raf: number;
    const slice = 100 / total;
    const baseline = completed * slice;
    const tick = () => {
      const elapsed = Date.now() - sliceStartRef.current;
      const withinSlice = slice * 0.92 * (1 - Math.exp(-elapsed / 9000));
      setPct(baseline + withinSlice);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, completed, total]);

  return pct;
}

const VIDEO_CLIP_WARNING_MINUTES = 5;

/** Shows a dismiss-free warning once any clip is within 5 minutes of its 30-minute
 * inactivity expiry, with a button that renews all of them at once. Ticks its own
 * clock (the expiresAt timestamps don't change on their own) so the countdown and
 * the warning's appearance/disappearance stay live without user action. */
function VideoClipExpiryBanner() {
  const wizard = useWizard();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const soonest = wizard.ownVideoClips.reduce<number | null>((min, c) => {
    const t = new Date(c.expiresAt).getTime();
    return min === null || t < min ? t : min;
  }, null);
  if (soonest === null) return null;

  const minutesLeft = Math.max(0, Math.ceil((soonest - now) / 60_000));
  if (minutesLeft > VIDEO_CLIP_WARNING_MINUTES) return null;

  return (
    <div className="flex items-center gap-3 mt-4 px-4 py-3 rounded-xl bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] border-[0.5px] border-[color-mix(in_srgb,var(--gold)_30%,transparent)]">
      <Icon name="alert-triangle" className="text-[var(--gold)] shrink-0" />
      <p className="flex-1 text-[12.5px] text-[var(--text-1)] leading-relaxed m-0">
        {minutesLeft === 0
          ? "Seus clipes de vídeo enviados vão expirar a qualquer momento por inatividade."
          : `Seus clipes de vídeo enviados expiram em ${minutesLeft} ${minutesLeft === 1 ? "minuto" : "minutos"} por inatividade.`}
      </p>
      <button
        type="button"
        onClick={() => wizard.renewVideoClips()}
        className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220] border-none cursor-pointer whitespace-nowrap"
      >
        Renovar
      </button>
    </div>
  );
}

export default function EstiloPage() {
  const wizard = useWizard();
  const n = wizard.selectedForVideo.length;
  const [showWarning, setShowWarning] = useState(false);
  const [prevN, setPrevN] = useState(n);
  const sortedSelected = [...wizard.selectedForVideo].sort((a, b) => a - b);
  const assignedUrls = wizard.assignedOwnImageUrls();

  useEffect(() => {
    wizard.loadVideoClips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const smoothProgressPct = useSmoothBuildProgress(
    wizard.buildingVideos,
    wizard.buildProgress?.completed ?? 0,
    wizard.buildProgress?.total ?? 0,
  );

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

      <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
        <span className="block text-[15px] font-semibold text-[var(--text-1)] mb-2">
          Cor da legenda
          <HelpTip
            label="Como funciona o automático"
            text="No automático, cada Estilo já tem uma cor de texto pensada pra ele. Escolhendo uma cor aqui, ela substitui a cor padrão do estilo em todos os vídeos."
          />
        </span>
        <div className="flex gap-2 flex-wrap mb-4">
          {CAPTION_COLOR_OPTIONS.map((c) => (
            <Pill
              key={c.id}
              selected={wizard.captionColor === c.id}
              onClick={() => wizard.setCaptionColor(c.id)}
              className="flex items-center gap-1.5"
            >
              {c.swatch && (
                <span
                  className="w-2.5 h-2.5 rounded-full border-[0.5px] border-[var(--line-strong)] shrink-0"
                  style={{ background: c.swatch }}
                />
              )}
              {c.label}
            </Pill>
          ))}
        </div>
        <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Tamanho da legenda</span>
        <div className="flex gap-2 mb-4">
          {CAPTION_SIZE_OPTIONS.map((s) => (
            <Pill key={s.id} selected={wizard.captionSize === s.id} onClick={() => wizard.setCaptionSize(s.id)}>
              {s.label}
            </Pill>
          ))}
        </div>
        <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Fonte da legenda</span>
        <div className="flex gap-2 mb-4">
          {CAPTION_FONT_OPTIONS.map((f) => (
            <Pill key={f.id} selected={wizard.captionFont === f.id} onClick={() => wizard.setCaptionFont(f.id)}>
              {f.label}
            </Pill>
          ))}
        </div>
        <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Sombra na legenda</span>
        <div className="flex gap-2 mb-4">
          <Pill selected={wizard.captionShadow} onClick={() => wizard.setCaptionShadow(true)}>
            Ativada
          </Pill>
          <Pill selected={!wizard.captionShadow} onClick={() => wizard.setCaptionShadow(false)}>
            Desativada
          </Pill>
        </div>
        <span className="block text-xs font-medium text-[var(--text-2)] mb-2">
          Fundo da legenda
          <HelpTip
            label="Como funciona o fundo"
            text="No automático, cada Estilo já tem um fundo pensado pra ele (alguns têm painel atrás do texto, outros não). Escolhendo 'Nenhum' ou uma cor aqui, isso substitui o padrão do estilo em todos os vídeos."
          />
        </span>
        <div className="flex gap-2 flex-wrap">
          {CAPTION_BACKGROUND_OPTIONS.map((b) => (
            <Pill
              key={b.id}
              selected={wizard.captionBackground === b.id}
              onClick={() => wizard.setCaptionBackground(b.id)}
              className="flex items-center gap-1.5"
            >
              {b.swatch && (
                <span
                  className="w-2.5 h-2.5 rounded-full border-[0.5px] border-[var(--line-strong)] shrink-0"
                  style={{ background: b.swatch }}
                />
              )}
              {b.label}
            </Pill>
          ))}
        </div>
        <span className="block text-xs font-medium text-[var(--text-2)] mt-4 mb-2">
          Posição vertical da legenda
          <HelpTip
            label="Como funciona a posição"
            text="Arraste o controle para mover a legenda para cima ou para baixo na tela e ancorar onde achar melhor. 'Automático' usa a posição padrão de cada Estilo."
          />
        </span>
        <div className="flex items-center gap-3 max-w-[420px]">
          <span className="text-[11px] text-[var(--text-3)] shrink-0">Topo</span>
          <input
            type="range"
            min={5}
            max={95}
            value={wizard.captionPositionY ?? 80}
            onChange={(e) => wizard.setCaptionPositionY(Number(e.target.value))}
            className="flex-1 accent-[var(--gold)]"
          />
          <span className="text-[11px] text-[var(--text-3)] shrink-0">Base</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[11px] text-[var(--text-3)]">
            {wizard.captionPositionY === null ? "Automático (padrão do estilo)" : `${wizard.captionPositionY}%`}
          </span>
          {wizard.captionPositionY !== null && (
            <button
              type="button"
              onClick={() => wizard.setCaptionPositionY(null)}
              className="text-[11px] text-[var(--teal)] bg-transparent border-none cursor-pointer underline p-0"
            >
              Voltar ao automático
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
        <FieldLabel className="text-[15px] font-semibold text-[var(--text-1)]">
          Áudio
          <HelpTip
            label="Como funciona o volume"
            text="Ajuste o volume da narração gravada e da música de fundo. No automático, a música fica baixa para não competir com a narração (ou mais alta quando não há narração)."
          />
        </FieldLabel>
        <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Volume da narração</span>
        <div className="flex items-center gap-3 max-w-[420px]">
          <span className="text-[11px] text-[var(--text-3)] shrink-0">Mudo</span>
          <input
            type="range"
            min={0}
            max={200}
            value={wizard.narrationVolume}
            onChange={(e) => wizard.setNarrationVolume(Number(e.target.value))}
            className="flex-1 accent-[var(--gold)]"
          />
          <span className="text-[11px] text-[var(--text-3)] shrink-0">Alto</span>
        </div>
        <div className="mt-1.5">
          <span className="text-[11px] text-[var(--text-3)]">{wizard.narrationVolume}%</span>
        </div>

        <span className="block text-xs font-medium text-[var(--text-2)] mt-4 mb-2">Volume da música de fundo</span>
        <div className="flex items-center gap-3 max-w-[420px]">
          <span className="text-[11px] text-[var(--text-3)] shrink-0">Mudo</span>
          <input
            type="range"
            min={0}
            max={100}
            value={wizard.musicVolume ?? 15}
            onChange={(e) => wizard.setMusicVolume(Number(e.target.value))}
            className="flex-1 accent-[var(--gold)]"
          />
          <span className="text-[11px] text-[var(--text-3)] shrink-0">Alto</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[11px] text-[var(--text-3)]">
            {wizard.musicVolume === null ? "Automático" : `${wizard.musicVolume}%`}
          </span>
          {wizard.musicVolume !== null && (
            <button
              type="button"
              onClick={() => wizard.setMusicVolume(null)}
              className="text-[11px] text-[var(--teal)] bg-transparent border-none cursor-pointer underline p-0"
            >
              Voltar ao automático
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
        <FieldLabel className="text-[15px] font-semibold text-[var(--text-1)]">
          Título
          <HelpTip
            label="Como funciona o título"
            text="Um texto no topo do vídeo, opcional — pode adicionar quantos quiser, cada um com seu próprio início e fim (com fade suave entrando e saindo). Adicione os títulos de cada vídeo na lista de temas logo abaixo — aqui você só ajusta a aparência, que vale para todos."
          />
        </FieldLabel>
        <OverlayStyleControls
          align={wizard.titleAlign}
          onAlign={wizard.setTitleAlign}
          color={wizard.titleColor}
          onColor={wizard.setTitleColor}
          size={wizard.titleSize}
          onSize={wizard.setTitleSize}
          font={wizard.titleFont}
          onFont={wizard.setTitleFont}
          shadow={wizard.titleShadow}
          onShadow={wizard.setTitleShadow}
        />
      </div>

      <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
        <FieldLabel className="text-[15px] font-semibold text-[var(--text-1)]">Subtítulo</FieldLabel>
        <OverlayStyleControls
          align={wizard.subtitleAlign}
          onAlign={wizard.setSubtitleAlign}
          color={wizard.subtitleColor}
          onColor={wizard.setSubtitleColor}
          size={wizard.subtitleSize}
          onSize={wizard.setSubtitleSize}
          font={wizard.subtitleFont}
          onFont={wizard.setSubtitleFont}
          shadow={wizard.subtitleShadow}
          onShadow={wizard.setSubtitleShadow}
        />
      </div>

      {n > 0 && (
        <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
          <span className="block text-xs font-medium text-[var(--text-2)] mb-3">
            Cena, música e imagens por vídeo
            <HelpTip
              label="Como isso afeta cada vídeo"
              text={
                <>
                  <strong>Duração de cena:</strong> cada cena é uma foto — o app soma a duração da narração (ou da
                  legenda, se você pulou a gravação) com 6 segundos de folga e divide pelo tempo escolhido pra saber
                  quantas fotos entram. <strong>Música:</strong> no automático, o clima já vem definido pela IA pra
                  esse roteiro; escolhendo um clima aqui, só esse vídeo usa esse clima em vez do automático.{" "}
                  <strong>Tema visual:</strong> no automático, as fotos seguem o assunto do roteiro; escolhendo um
                  tema, as buscas de foto ficam enviesadas pra esse estilo (natureza, cidades, etc).
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
                <div className="flex items-center gap-2.5 flex-wrap w-full">
                  <span className="text-[11px] text-[var(--text-3)] shrink-0">Tema visual:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {IMAGE_THEME_OPTIONS.map((t) => (
                      <Pill
                        key={t.id}
                        selected={(wizard.imageThemeByTema[i] ?? "auto") === t.id}
                        onClick={() => wizard.setImageThemeForTema(i, t.id)}
                      >
                        {t.label}
                      </Pill>
                    ))}
                  </div>
                </div>
                <div className="w-full flex flex-col gap-3 p-3 rounded-lg bg-[var(--bg-1)] border-[0.5px] border-[var(--line-strong)]">
                  <span className="text-[12.5px] font-semibold text-[var(--text-1)]">
                    Título e subtítulo deste vídeo
                    <HelpTip
                      label="Como funciona título e subtítulo"
                      text="Textos opcionais que aparecem no topo do vídeo — você define de qual até qual segundo cada um fica na tela, com fade suave entrando e saindo nas bordas desse intervalo. A aparência (cor, fonte, tamanho...) é ajustada lá em cima, em 'Título' e 'Subtítulo' — aqui você só define o texto e o intervalo de cada um, vídeo por vídeo."
                    />
                  </span>
                  <CueListEditor
                    label="Título"
                    cues={wizard.titleCuesByTema[i] ?? []}
                    onAdd={() => wizard.addTitleCue(i)}
                    onUpdate={(cueId, patch) => wizard.updateTitleCue(i, cueId, patch)}
                    onRemove={(cueId) => wizard.removeTitleCue(i, cueId)}
                  />
                  <CueListEditor
                    label="Subtítulo"
                    cues={wizard.subtitleCuesByTema[i] ?? []}
                    onAdd={() => wizard.addSubtitleCue(i)}
                    onUpdate={(cueId, patch) => wizard.updateSubtitleCue(i, cueId, patch)}
                    onRemove={(cueId) => wizard.removeSubtitleCue(i, cueId)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
        <FieldLabel className="text-[15px] font-semibold text-[var(--text-1)]">
          Imagens próprias (opcional)
          <HelpTip
            label="Como encaixar suas fotos nos vídeos"
            text={
              <>
                Envie suas fotos aqui e depois abra <strong>&quot;Fotos por vídeo&quot;</strong> logo abaixo pra
                escolher, vídeo por vídeo, em qual cena cada uma entra — ou use o botão{" "}
                <strong>&quot;Usar minhas fotos em ordem&quot;</strong> pra preencher tudo de uma vez, na ordem do nome
                do arquivo. Sem foto atribuída, o vídeo inteiro usa fotos dos bancos gratuitos automaticamente.
              </>
            }
          />
        </FieldLabel>
        <p className="text-[13px] text-[var(--text-2)] mb-1 leading-relaxed">
          Suas próprias fotos, de lugares, pessoas ou produtos citados no roteiro.
        </p>
        <p className="text-[12px] text-[var(--text-3)] mb-4 leading-relaxed">
          Dica: renomeie os arquivos com números antes de enviar (ex.: <code>minha_foto_001.jpg</code>,{" "}
          <code>minha_foto_002.jpg</code>) pra controlar a ordem em que elas aparecem no vídeo.
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
                  assignedUrls.has(img.url) ? "border-[var(--teal)]" : "border-[var(--line)]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-7 h-7 object-cover rounded-md shrink-0" />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px]" title={img.name}>
                  {img.name}
                </span>
                {assignedUrls.has(img.url) && (
                  <span className="text-[var(--teal)] text-[13px] shrink-0" title="Atribuída a pelo menos um vídeo">
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
      </div>

      <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
        <FieldLabel className="text-[15px] font-semibold text-[var(--text-1)]">
          Vídeos próprios (opcional)
          <HelpTip
            label="Como funcionam os clipes próprios"
            text={
              <>
                Envie clipes de <strong>5, 10, 15 ou 30 segundos</strong> — outras durações não são aceitas. Depois,
                em &quot;Fotos por vídeo&quot;, escolha em qual cena cada clipe entra (pode misturar com fotos
                própias ou automáticas). Clipes enviados ficam disponíveis por 30 minutos de inatividade e somem
                depois disso.
              </>
            }
          />
        </FieldLabel>
        <p className="text-[13px] text-[var(--text-2)] mb-4 leading-relaxed">
          Seus próprios clipes de vídeo, em vez de foto parada, pras cenas do vídeo.
        </p>
        <Dropzone
          icon="movie"
          title={wizard.ownVideoClipsUploading ? "Enviando..." : "Clique para escolher ou arraste o vídeo aqui"}
          subtitle="MP4 · 5, 10, 15 ou 30 segundos · até 30MB"
          accept=".mp4,.mov,video/*"
          onFiles={(files) => wizard.uploadVideoClip(files[0])}
        />
        {wizard.ownVideoClipsError && (
          <p className="text-[13px] text-[var(--gold)] mt-3">
            <Icon name="alert-triangle" /> {wizard.ownVideoClipsError}
          </p>
        )}
        {wizard.ownVideoClips.length > 0 && (
          <>
            <VideoClipExpiryBanner />
            <div className="flex flex-wrap gap-2 mt-4">
              {wizard.ownVideoClips.map((clip) => (
                <div
                  key={clip.id}
                  className={`flex items-center gap-2 bg-[var(--bg-2)] border-[0.5px] rounded-[9px] pl-2 pr-2 py-1.5 text-xs text-[var(--text-2)] max-w-[240px] ${
                    assignedUrls.has(clip.url ?? "") ? "border-[var(--teal)]" : "border-[var(--line)]"
                  }`}
                >
                  <Icon name="movie" className="text-[var(--text-3)] shrink-0" />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px]" title={clip.name}>
                    {clip.name} · {clip.durationSeconds}s
                  </span>
                  {assignedUrls.has(clip.url ?? "") && (
                    <span className="text-[var(--teal)] text-[13px] shrink-0" title="Atribuído a pelo menos um vídeo">
                      <Icon name="check" />
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Remover clipe"
                    onClick={() => wizard.removeVideoClip(clip.id)}
                    className="shrink-0 bg-transparent border-none text-[var(--text-3)] cursor-pointer text-sm leading-none flex hover:text-[var(--gold)]"
                  >
                    <Icon name="minus" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {(wizard.ownImages.length > 0 || wizard.ownVideoClips.length > 0) && n > 0 && (
        <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
          <FieldLabel className="text-[15px] font-semibold text-[var(--text-1)]">
            Fotos e vídeos por cena
            <HelpTip
              label="Como funciona"
              text={
                <>
                  Cada vídeo é montado com várias cenas — abra um tema pra ver quantas e escolher qual das suas fotos
                  ou clipes de vídeo entra em cada uma. Deixou alguma em &quot;Automático&quot;? Ela é preenchida com
                  foto grátis do banco. Atribuiu todas? O vídeo usa só o seu material, sem buscar nada nos bancos
                  gratuitos.
                </>
              }
            />
          </FieldLabel>
          <div className="flex flex-col gap-2">
            {sortedSelected.map((i) => (
              <TemaPhotoPanel key={i} temaIndex={i} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
        <FieldLabel className="text-[15px] font-semibold text-[var(--text-1)]">
          Marca d&apos;água / assinatura (opcional)
          <HelpTip
            label="Como funciona a marca d'água"
            text="Envie uma logo em PNG com fundo transparente para aparecer em todos os vídeos gerados, no canto que você escolher. No vídeo final ela sempre sai com 180px de largura (altura proporcional) — envie em pelo menos 360x360px para não ficar borrada."
          />
        </FieldLabel>
        <p className="text-[13px] text-[var(--text-2)] mb-4 leading-relaxed">
          Sua logo aparece em todos os vídeos desta montagem. <strong>Aviso:</strong> precisa ser um PNG com fundo
          transparente. Tamanho recomendado: quadrada, a partir de 360x360px (ela sai com 180px de largura no vídeo
          final).
        </p>
        {!wizard.watermark ? (
          <Dropzone
            icon="photo"
            title={wizard.watermarkUploading ? "Enviando..." : "Clique para escolher um PNG transparente"}
            subtitle="PNG com fundo transparente · mín. 360x360px · até 5MB"
            accept=".png,image/png"
            onFiles={(files) => wizard.uploadWatermark(files[0])}
          />
        ) : (
          <div className="flex items-center gap-3 bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[10px] pl-2 pr-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={wizard.watermark.url}
              alt=""
              className="w-9 h-9 object-contain rounded-md shrink-0 bg-[var(--bg-3)]"
            />
            <span className="text-[13px] text-[var(--text-2)] flex-1">Logo enviada</span>
            <button
              type="button"
              aria-label="Remover logo"
              onClick={wizard.removeWatermark}
              className="shrink-0 bg-transparent border-none text-[var(--text-3)] cursor-pointer text-sm leading-none flex hover:text-[var(--gold)]"
            >
              <Icon name="minus" />
            </button>
          </div>
        )}
        {wizard.watermarkError && (
          <p className="text-[13px] text-[var(--gold)] mt-3">
            <Icon name="alert-triangle" /> {wizard.watermarkError}
          </p>
        )}
        {wizard.watermark && (
          <div className="mt-4">
            <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Posição</span>
            <div className="flex gap-2 flex-wrap">
              {WATERMARK_POSITIONS.map((p) => (
                <Pill
                  key={p.id}
                  selected={wizard.watermarkPosition === p.id}
                  onClick={() => wizard.setWatermarkPosition(p.id)}
                >
                  {p.label}
                </Pill>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t-2 border-[var(--line-strong)]">
        <FieldLabel className="text-[15px] font-semibold text-[var(--text-1)]">
          Card final de assinatura (Pro)
          <HelpTip
            label="Como funciona o card final"
            text="Depois do vídeo escurecer no final, sua logo e uma chamada para assinar aparecem por alguns segundos (fade in e fade out) antes do vídeo acabar. Recurso do plano Pro."
          />
        </FieldLabel>
        <p className="text-[13px] text-[var(--text-2)] mb-4 leading-relaxed">
          Mostra sua logo e uma frase de chamada (ex: &quot;Assine o app&quot;) na tela preta do final do vídeo.
        </p>
        <div className="flex gap-2 mb-4">
          <Pill selected={wizard.endCardEnabled} onClick={() => wizard.setEndCardEnabled(true)}>
            Ativado
          </Pill>
          <Pill selected={!wizard.endCardEnabled} onClick={() => wizard.setEndCardEnabled(false)}>
            Desativado
          </Pill>
        </div>
        {wizard.endCardEnabled && (
          <>
            {!wizard.endCardLogo ? (
              <Dropzone
                icon="photo"
                title={wizard.endCardLogoUploading ? "Enviando..." : "Clique para escolher um PNG transparente"}
                subtitle="PNG com fundo transparente · mín. 320x320px · até 5MB"
                accept=".png,image/png"
                onFiles={(files) => wizard.uploadEndCardLogo(files[0])}
              />
            ) : (
              <div className="flex items-center gap-3 bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[10px] pl-2 pr-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wizard.endCardLogo.url}
                  alt=""
                  className="w-9 h-9 object-contain rounded-md shrink-0 bg-[var(--bg-3)]"
                />
                <span className="text-[13px] text-[var(--text-2)] flex-1">Logo enviada</span>
                <button
                  type="button"
                  aria-label="Remover logo do card final"
                  onClick={wizard.removeEndCardLogo}
                  className="shrink-0 bg-transparent border-none text-[var(--text-3)] cursor-pointer text-sm leading-none flex hover:text-[var(--gold)]"
                >
                  <Icon name="minus" />
                </button>
              </div>
            )}
            {wizard.endCardLogoError && (
              <p className="text-[13px] text-[var(--gold)] mt-3">
                <Icon name="alert-triangle" /> {wizard.endCardLogoError}
              </p>
            )}
            <div className="mt-4">
              <span className="block text-xs font-medium text-[var(--text-2)] mb-2">Frase do card final</span>
              <TextInput
                value={wizard.endCardText}
                onChange={(e) => wizard.setEndCardText(e.target.value)}
                placeholder="Assine o app e crie o seu vídeo agora"
                maxLength={200}
              />
            </div>
          </>
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
        {wizard.buildingVideos && wizard.buildProgress && (
          <div className="mb-4 max-w-[360px]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[12px] text-[var(--text-2)]">
                {wizard.buildProgress.completed} de {wizard.buildProgress.total} vídeo
                {wizard.buildProgress.total === 1 ? "" : "s"} pronto
                {wizard.buildProgress.total === 1 ? "" : "s"}
              </span>
              <span className="text-[12px] font-mono text-[var(--text-2)]">{Math.round(smoothProgressPct)}%</span>
            </div>
            <div className="w-full h-5 rounded-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] overflow-hidden">
              <div
                className="postime-progress-fill h-full bg-[var(--gold)] transition-[width] duration-300 ease-out"
                style={{ width: `${smoothProgressPct}%` }}
              />
            </div>
          </div>
        )}

        <Btn
          variant="primary"
          disabled={wizard.buildingVideos}
          onClick={async () => {
            if (wizard.selectedForVideo.length === 0) {
              setShowWarning(true);
              return;
            }
            const result = await wizard.confirmBuild();
            if (!result.ok) return;
            // Stays on Estilo instead of jumping to Download — the finished
            // video shows up right below (see the "Vídeos prontos" list), so
            // the user can keep picking the next tema and build one at a time
            // without losing their place. Download is still one click away.
            if (result.dailyLimitHit) {
              // A quota problem isn't a recording problem — the buildFailed
              // ("Regravar") modal would be misleading here, since re-recording
              // wouldn't fix it. Explain the real cause instead.
              wizard.openUpgradeModal();
            } else if (result.failedIndices.length > 0) {
              wizard.openModal({ type: "buildFailed", failedIndices: result.failedIndices });
            }
          }}
        >
          <Icon name={wizard.buildingVideos ? "loader-2" : "arrow-right"} spin={wizard.buildingVideos} />{" "}
          {wizard.buildingVideos ? "Montando vídeo..." : "Confirmar e montar vídeo"}
        </Btn>
      </div>
    </Card>
  );
}

