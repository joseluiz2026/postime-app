"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LlmProvider } from "./ai/generate-roteiros";
import type { MusicMood } from "./audio/moods";
import { estimateReadingDurationSeconds, splitTextIntoChunks } from "./render/captions";
import { computeSegmentCount } from "./render/segments";
import { themeQueryFor, type ImageThemeId } from "./images/themes";
import {
  type AccessPhase,
  type Duration,
  allowedDurationsFor,
  dailyVideoLimitFor,
  getAccessPhase,
  getPhaseDaysLeft,
} from "./plan";
import { createClient } from "./supabase/client";

/** Reads a recorded/uploaded audio Blob's duration without uploading it first —
 * lets the photo-assignment picker show "N imagens necessárias" immediately. */
function readAudioDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const cleanup = (result: number | null) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    audio.onloadedmetadata = () => cleanup(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => cleanup(null);
    audio.src = url;
  });
}

export type { Duration } from "./plan";
export type SourceType = "ebook" | "texto" | "link" | "youtube" | "websearch";
export type StyleName =
  | "Minimalista"
  | "Dinâmico"
  | "Cinematográfico"
  | "Neon Bold"
  | "Kinetic Text"
  | "Split Screen";
export type SceneSeconds = 1 | 2 | 3 | 4 | 5;
export type MusicMoodSelection = MusicMood | "auto";
export type CaptionColor = "auto" | "white" | "black" | "yellow" | "red" | "green" | "blue" | "purple";
export type CaptionBackground = "auto" | "none" | "white" | "black" | "yellow" | "red" | "green" | "blue" | "purple";
export type CaptionSize = "small" | "medium" | "large";
export type CaptionFont = "poppins" | "anton" | "archivoblack";
export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type TextAlign = "left" | "center" | "right";
/** One título/subtítulo occurrence: shows `text` from `start` to `end` seconds
 * into the video, fading in/out at the edges of that window. A tema can have
 * zero, one, or several — entirely optional, unlike the always-on-if-set
 * single overlay this replaced. */
export type TextOverlayCue = { id: string; text: string; start: number; end: number };

export type OwnImage = { name: string; url: string; path: string };
export type Roteiro = { meta: string; text: string; mood?: MusicMood; imageQuery?: string };
// Core's video output is deliberately blind to distribution (see lib/distribution-context.tsx) —
// it exposes an id so a channel-connect module can reference "which video", nothing about
// publish state itself.
export type Video = {
  id: string;
  title: string;
  temaIndex: number;
  style?: string;
  imageUrl?: string;
  imageCredit?: string;
  videoUrl?: string;
  videoPath?: string;
  expiresAt?: string;
  durationSeconds?: number;
};

export type ModalId =
  | "upgrade"
  | "eleven"
  | "account"
  | "whatsapp"
  | "tiktok"
  | "buildFailed";

export type AccountModalType = "password" | "report" | "faq" | "support";

type ModalState =
  | { type: null }
  | { type: "upgrade" }
  | { type: "eleven" }
  | { type: "account"; accountType: AccountModalType }
  | { type: "whatsapp" }
  | { type: "tiktok" }
  | { type: "buildFailed"; failedIndices: number[] };

/** Best-effort check that a PNG actually has transparent pixels — samples every
 * pixel's alpha channel via canvas, since the file extension alone doesn't tell
 * us whether the background was actually cut out. Also reports the image's
 * pixel dimensions so the caller can reject anything too small to survive the
 * render's fixed 180px-wide watermark overlay without looking blurry. */
async function inspectWatermarkPng(file: File): Promise<{ transparent: boolean; width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { transparent: true, width: bitmap.width, height: bitmap.height };
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        transparent = true;
        break;
      }
    }
    return { transparent, width: bitmap.width, height: bitmap.height };
  } catch {
    return null;
  }
}

// Render always scales the watermark to this fixed width (see lib/render/ken-burns.ts) —
// anything narrower than this would be upscaled and look blurry in the final video.
const WATERMARK_MIN_DIMENSION_PX = 180;

type WizardState = {
  // account
  accountName: string;
  // Access phase is derived purely from account age (trial → free → locked) — see
  // lib/plan.ts for the day counts and per-phase video/duration limits. No plan
  // toggle, no per-generation counter.
  accessPhase: AccessPhase;
  phaseDaysLeft: number;
  isSubscribed: boolean;
  dailyVideoLimit: number | null;
  allowedDurations: readonly Duration[];
  voiceCloned: boolean;
  selectedVoiceName: string;

  // AI usage / own key
  hasOwnKey: boolean;
  ownKeyProvider: LlmProvider | null;
  savingKey: boolean;
  keyError: string | null;
  generating: boolean;
  generateError: string | null;
  regeneratingIndex: number | null;

  // source
  sourceType: SourceType;
  ebookFileName: string | null;
  texto: string;
  link: string;
  youtube: string;
  websearch: string;
  ownImages: OwnImage[];
  ownImagesUploading: boolean;
  ownImagesError: string | null;

  // roteiros
  duration: Duration;
  qty: number;
  roteiros: Roteiro[];

  // gravação
  scriptIndex: number;
  savedTemas: boolean[];
  usedTemas: boolean[];
  failedTemas: boolean[];
  deletedTemas: boolean[];
  selectedForVideo: number[];
  audioPaths: (string | null)[];
  audioDurationByTema: (number | null)[];
  audioUploading: boolean;
  audioError: string | null;
  // One entry per image segment of that tema's video; a URL means "use this own
  // photo in this slot", null means "fill this slot automatically with stock".
  imageAssignmentsByTema: (string | null)[][];
  // Optional, timed headline/support text cues per tema — an empty array means
  // "no overlays for this video". Content and timing are per-tema (each video's
  // topic/pacing differs); the look (align/font/size/color/shadow) is one
  // shared style per batch, below.
  titleCuesByTema: TextOverlayCue[][];
  subtitleCuesByTema: TextOverlayCue[][];

  // estilo
  selectedStyle: StyleName;
  sceneSecondsByTema: SceneSeconds[];
  musicMoodByTema: MusicMoodSelection[];
  imageThemeByTema: ImageThemeId[];
  // 0-200, % of the narration's original recorded volume; 100 = unchanged.
  narrationVolume: number;
  // 0-100 absolute %; null = "automático" (quieter under narration, louder alone).
  musicVolume: number | null;
  captionColor: CaptionColor;
  captionSize: CaptionSize;
  captionFont: CaptionFont;
  captionShadow: boolean;
  captionBackground: CaptionBackground;
  // null = "automático" — each style keeps its own fixed vertical position;
  // a number (0-100, top-to-bottom % of frame height) overrides it for every video.
  captionPositionY: number | null;
  titleAlign: TextAlign;
  titleColor: CaptionColor;
  titleSize: CaptionSize;
  titleFont: CaptionFont;
  titleShadow: boolean;
  subtitleAlign: TextAlign;
  subtitleColor: CaptionColor;
  subtitleSize: CaptionSize;
  subtitleFont: CaptionFont;
  subtitleShadow: boolean;
  watermark: { url: string; path: string } | null;
  watermarkPosition: WatermarkPosition;
  watermarkUploading: boolean;
  watermarkError: string | null;

  // download
  videos: Video[];
  videoCountStatus: string;

  modal: ModalState;
};

type WizardContextValue = WizardState & {
  userEmail: string;
  setAccountName: (name: string) => void;
  accountInitials: () => string;
  signOut: () => void;

  setSourceType: (t: SourceType) => void;
  setEbookFileName: (name: string | null) => void;
  setTexto: (v: string) => void;
  setLink: (v: string) => void;
  setYoutube: (v: string) => void;
  setWebsearch: (v: string) => void;
  addOwnImages: (files: FileList) => Promise<void>;
  removeOwnImage: (idx: number) => void;
  sourceLabel: () => string | null;
  assignedOwnImageUrls: () => Set<string>;
  neededSegmentsForTema: (idx: number) => number;
  segmentTextsForTema: (idx: number) => string[];
  setImageAssignment: (temaIdx: number, segmentIdx: number, url: string | null) => void;
  addTitleCue: (temaIdx: number) => void;
  updateTitleCue: (temaIdx: number, cueId: string, patch: Partial<Pick<TextOverlayCue, "text" | "start" | "end">>) => void;
  removeTitleCue: (temaIdx: number, cueId: string) => void;
  addSubtitleCue: (temaIdx: number) => void;
  updateSubtitleCue: (temaIdx: number, cueId: string, patch: Partial<Pick<TextOverlayCue, "text" | "start" | "end">>) => void;
  removeSubtitleCue: (temaIdx: number, cueId: string) => void;

  setDuration: (d: Duration) => void;
  setQty: (v: number) => void;
  qtyMax: () => number;

  openUpgradeModal: () => void;

  refreshUsage: () => Promise<void>;
  saveOwnKey: (provider: LlmProvider, apiKey: string) => Promise<boolean>;
  removeOwnKey: () => Promise<void>;

  editRoteiroText: (idx: number, text: string) => void;
  regenerateRoteiro: (idx: number) => Promise<void>;
  clickGerar: () => Promise<void>;

  setScriptIndex: (i: number) => void;
  uploadRecording: (idx: number, file: Blob, ext: string) => Promise<boolean>;
  skipAudio: (idx: number) => void;
  retryRecording: (idx: number) => void;
  retryVideo: (video: Video) => void;
  deleteVideo: (video: Video) => void;
  deleteRoteiro: (idx: number) => void;
  toggleSelectedForVideo: (idx: number) => void;

  setSelectedStyle: (s: StyleName) => void;
  setNarrationVolume: (v: number) => void;
  setMusicVolume: (v: number | null) => void;
  setCaptionColor: (c: CaptionColor) => void;
  setCaptionSize: (s: CaptionSize) => void;
  setCaptionFont: (f: CaptionFont) => void;
  setCaptionShadow: (v: boolean) => void;
  setCaptionBackground: (b: CaptionBackground) => void;
  setCaptionPositionY: (v: number | null) => void;
  setTitleAlign: (a: TextAlign) => void;
  setTitleColor: (c: CaptionColor) => void;
  setTitleSize: (s: CaptionSize) => void;
  setTitleFont: (f: CaptionFont) => void;
  setTitleShadow: (v: boolean) => void;
  setSubtitleAlign: (a: TextAlign) => void;
  setSubtitleColor: (c: CaptionColor) => void;
  setSubtitleSize: (s: CaptionSize) => void;
  setSubtitleFont: (f: CaptionFont) => void;
  setSubtitleShadow: (v: boolean) => void;
  setSceneSecondsForTema: (idx: number, s: SceneSeconds) => void;
  setMusicMoodForTema: (idx: number, m: MusicMoodSelection) => void;
  setImageThemeForTema: (idx: number, id: ImageThemeId) => void;
  uploadWatermark: (file: File) => Promise<void>;
  removeWatermark: () => void;
  setWatermarkPosition: (pos: WatermarkPosition) => void;
  confirmBuild: () => Promise<{ ok: boolean; failedIndices: number[]; dailyLimitHit: boolean }>;
  buildingVideos: boolean;
  buildProgress: { completed: number; total: number } | null;
  buildError: string | null;

  connectEleven: (name: string) => void;
  saveWhatsapp: () => void;

  openModal: (m: ModalState) => void;
  closeModal: () => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({
  children,
  initialName,
  userEmail,
  userId,
  createdAt,
}: {
  children: ReactNode;
  initialName: string;
  userEmail: string;
  userId: string;
  /** ISO timestamp — the real auth user's created_at, from app/app/layout.tsx. Access phase (see lib/plan.ts) is derived from this. */
  createdAt: string;
}) {
  const router = useRouter();
  const [accountName, setAccountNameState] = useState(initialName);
  const [voiceCloned, setVoiceCloned] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  const createdAtDate = new Date(createdAt);
  // Date.now() can't be read directly during render (impure) — a lazy useState
  // initializer is the sanctioned escape hatch, evaluated once at mount.
  const [now] = useState(() => Date.now());
  const accessPhase = getAccessPhase(createdAtDate, now);
  const phaseDaysLeft = getPhaseDaysLeft(createdAtDate, now);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const dailyVideoLimit = dailyVideoLimitFor(accessPhase, isSubscribed);
  const allowedDurations = allowedDurationsFor(accessPhase, isSubscribed);

  const [hasOwnKey, setHasOwnKey] = useState(false);
  const [ownKeyProvider, setOwnKeyProvider] = useState<LlmProvider | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const [sourceType, setSourceType] = useState<SourceType>("ebook");
  const [ebookFileName, setEbookFileName] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [link, setLink] = useState("");
  const [youtube, setYoutube] = useState("");
  const [websearch, setWebsearch] = useState("");
  const [ownImages, setOwnImages] = useState<OwnImage[]>([]);
  const [ownImagesUploading, setOwnImagesUploading] = useState(false);
  const [ownImagesError, setOwnImagesError] = useState<string | null>(null);

  const [duration, setDurationState] = useState<Duration>("15s");
  const [qty, setQtyState] = useState(3);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);

  const [scriptIndex, setScriptIndex] = useState(0);
  const [savedTemas, setSavedTemas] = useState<boolean[]>([]);
  const [usedTemas, setUsedTemas] = useState<boolean[]>([]);
  const [failedTemas, setFailedTemas] = useState<boolean[]>([]);
  const [deletedTemas, setDeletedTemas] = useState<boolean[]>([]);
  const [selectedForVideo, setSelectedForVideo] = useState<number[]>([]);
  const [audioPaths, setAudioPaths] = useState<(string | null)[]>([]);
  const [audioDurationByTema, setAudioDurationByTema] = useState<(number | null)[]>([]);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [imageAssignmentsByTema, setImageAssignmentsByTema] = useState<(string | null)[][]>([]);
  const [titleCuesByTema, setTitleCuesByTema] = useState<TextOverlayCue[][]>([]);
  const [subtitleCuesByTema, setSubtitleCuesByTema] = useState<TextOverlayCue[][]>([]);

  const [selectedStyle, setSelectedStyle] = useState<StyleName>("Minimalista");
  const [captionColor, setCaptionColor] = useState<CaptionColor>("auto");
  const [captionSize, setCaptionSize] = useState<CaptionSize>("medium");
  const [captionFont, setCaptionFont] = useState<CaptionFont>("poppins");
  const [captionShadow, setCaptionShadow] = useState(false);
  const [captionBackground, setCaptionBackground] = useState<CaptionBackground>("auto");
  const [captionPositionY, setCaptionPositionY] = useState<number | null>(null);
  const [titleAlign, setTitleAlign] = useState<TextAlign>("center");
  const [titleColor, setTitleColor] = useState<CaptionColor>("auto");
  const [titleSize, setTitleSize] = useState<CaptionSize>("medium");
  const [titleFont, setTitleFont] = useState<CaptionFont>("poppins");
  const [titleShadow, setTitleShadow] = useState(false);
  const [subtitleAlign, setSubtitleAlign] = useState<TextAlign>("center");
  const [subtitleColor, setSubtitleColor] = useState<CaptionColor>("auto");
  const [subtitleSize, setSubtitleSize] = useState<CaptionSize>("medium");
  const [subtitleFont, setSubtitleFont] = useState<CaptionFont>("poppins");
  const [subtitleShadow, setSubtitleShadow] = useState(false);
  const [sceneSecondsByTema, setSceneSecondsByTema] = useState<SceneSeconds[]>([]);
  const [musicMoodByTema, setMusicMoodByTema] = useState<MusicMoodSelection[]>([]);
  const [imageThemeByTema, setImageThemeByTema] = useState<ImageThemeId[]>([]);
  const [narrationVolume, setNarrationVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState<number | null>(null);
  const [watermark, setWatermark] = useState<{ url: string; path: string } | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>("bottom-right");
  const [watermarkUploading, setWatermarkUploading] = useState(false);
  const [watermarkError, setWatermarkError] = useState<string | null>(null);

  const setSceneSecondsForTema = useCallback((idx: number, s: SceneSeconds) => {
    setSceneSecondsByTema((prev) => prev.map((v, i) => (i === idx ? s : v)));
  }, []);

  const setMusicMoodForTema = useCallback((idx: number, m: MusicMoodSelection) => {
    setMusicMoodByTema((prev) => prev.map((v, i) => (i === idx ? m : v)));
  }, []);

  const setImageThemeForTema = useCallback((idx: number, id: ImageThemeId) => {
    setImageThemeByTema((prev) => prev.map((v, i) => (i === idx ? id : v)));
  }, []);

  const [videos, setVideos] = useState<Video[]>([]);
  const [videoCountStatus, setVideoCountStatus] = useState("");
  const [buildingVideos, setBuildingVideos] = useState(false);
  const [buildProgress, setBuildProgress] = useState<{ completed: number; total: number } | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const whatsappPromptShown = useRef(false);

  const [modal, setModal] = useState<ModalState>({ type: null });
  const openModal = useCallback((m: ModalState) => setModal(m), []);
  const closeModal = useCallback(() => setModal({ type: null }), []);

  const refreshUsage = useCallback(async () => {
    const supabase = createClient();
    const [keyRes, subRes] = await Promise.all([
      supabase.from("user_api_keys").select("provider, created_at").eq("category", "texto").maybeSingle(),
      supabase.from("subscriptions").select("status").maybeSingle(),
    ]);
    setHasOwnKey(!!keyRes.data);
    setOwnKeyProvider((keyRes.data?.provider as LlmProvider | undefined) ?? null);
    setIsSubscribed(subRes.data?.status === "active");
  }, [setIsSubscribed]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const saveOwnKey = useCallback(
    async (provider: LlmProvider, apiKey: string): Promise<boolean> => {
      setSavingKey(true);
      setKeyError(null);
      try {
        const res = await fetch("/api/account/api-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "texto", provider, apiKey }),
        });
        const data = await res.json();
        if (!res.ok) {
          setKeyError(
            data.error === "invalid_key"
              ? "Chave inválida ou sem permissão — verifique e tente novamente."
              : "Não foi possível salvar a chave agora.",
          );
          return false;
        }
        await refreshUsage();
        return true;
      } catch {
        setKeyError("Falha de conexão. Tente novamente.");
        return false;
      } finally {
        setSavingKey(false);
      }
    },
    [refreshUsage],
  );

  const removeOwnKey = useCallback(async () => {
    setSavingKey(true);
    try {
      await fetch("/api/account/api-key", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "texto" }),
      });
      await refreshUsage();
    } finally {
      setSavingKey(false);
    }
  }, [refreshUsage]);

  const sourceLabel = useCallback((): string | null => {
    if (sourceType === "ebook") return ebookFileName;
    if (sourceType === "texto")
      return texto.trim() ? texto.trim().slice(0, 28) + (texto.trim().length > 28 ? "…" : "") : null;
    if (sourceType === "link") return link.trim() || null;
    if (sourceType === "youtube") return youtube.trim() || null;
    return websearch.trim() || null;
  }, [sourceType, ebookFileName, texto, link, youtube, websearch]);

  const assignedOwnImageUrls = useCallback((): Set<string> => {
    const set = new Set<string>();
    imageAssignmentsByTema.forEach((slots) => slots.forEach((url) => url && set.add(url)));
    return set;
  }, [imageAssignmentsByTema]);

  /** Duration used to size this tema's video: the recorded narration's real
   * length if one was captured, otherwise the same reading-time estimate the
   * render falls back to when audio was skipped — keeps the picker's segment
   * count in sync with what the render route will actually build. */
  const durationForTema = useCallback(
    (idx: number): number => audioDurationByTema[idx] ?? estimateReadingDurationSeconds(roteiros[idx]?.text ?? ""),
    [audioDurationByTema, roteiros],
  );

  const neededSegmentsForTema = useCallback(
    (idx: number): number => computeSegmentCount(durationForTema(idx), sceneSecondsByTema[idx] ?? 3),
    [durationForTema, sceneSecondsByTema],
  );

  const segmentTextsForTema = useCallback(
    (idx: number): string[] => splitTextIntoChunks(roteiros[idx]?.text ?? "", neededSegmentsForTema(idx)),
    [roteiros, neededSegmentsForTema],
  );

  const setImageAssignment = useCallback((temaIdx: number, segmentIdx: number, url: string | null) => {
    setImageAssignmentsByTema((prev) => {
      const next = prev.map((slots) => [...slots]);
      while (!next[temaIdx]) next.push([]);
      const slots = next[temaIdx];
      while (slots.length <= segmentIdx) slots.push(null);
      slots[segmentIdx] = url;
      return next;
    });
  }, []);

  /** Generic helper behind the four cue CRUD functions below — both título and
   * subtítulo cue lists are shaped identically (per-tema array of cue arrays),
   * only the setter differs. */
  function makeCueActions(setLists: React.Dispatch<React.SetStateAction<TextOverlayCue[][]>>) {
    const add = (temaIdx: number) => {
      setLists((prev) => {
        const next = prev.map((cues) => [...cues]);
        while (next.length <= temaIdx) next.push([]);
        next[temaIdx].push({ id: crypto.randomUUID(), text: "", start: 0, end: 4 });
        return next;
      });
    };
    const update = (temaIdx: number, cueId: string, patch: Partial<Pick<TextOverlayCue, "text" | "start" | "end">>) => {
      setLists((prev) =>
        prev.map((cues, i) => (i === temaIdx ? cues.map((c) => (c.id === cueId ? { ...c, ...patch } : c)) : cues)),
      );
    };
    const remove = (temaIdx: number, cueId: string) => {
      setLists((prev) => prev.map((cues, i) => (i === temaIdx ? cues.filter((c) => c.id !== cueId) : cues)));
    };
    return { add, update, remove };
  }

  const titleCueActions = useMemo(() => makeCueActions(setTitleCuesByTema), []);
  const subtitleCueActions = useMemo(() => makeCueActions(setSubtitleCuesByTema), []);
  const addTitleCue = titleCueActions.add;
  const updateTitleCue = titleCueActions.update;
  const removeTitleCue = titleCueActions.remove;
  const addSubtitleCue = subtitleCueActions.add;
  const updateSubtitleCue = subtitleCueActions.update;
  const removeSubtitleCue = subtitleCueActions.remove;

  const addOwnImages = useCallback(
    async (files: FileList) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;
      setOwnImagesUploading(true);
      setOwnImagesError(null);
      try {
        const supabase = createClient();
        const next: OwnImage[] = [];
        for (const file of imageFiles) {
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${userId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("postime-images")
            .upload(path, file, { contentType: file.type || undefined });
          if (upErr) continue;
          const { data: signed } = await supabase.storage
            .from("postime-images")
            .createSignedUrl(path, 60 * 60 * 24);
          if (signed?.signedUrl) next.push({ name: file.name, url: signed.signedUrl, path });
        }
        if (next.length < imageFiles.length) {
          setOwnImagesError("Algumas imagens não puderam ser enviadas. Tente novamente.");
        }
        setOwnImages((prev) => [...prev, ...next]);
      } catch {
        setOwnImagesError("Falha de conexão. Tente novamente.");
      } finally {
        setOwnImagesUploading(false);
      }
    },
    [userId],
  );

  const removeOwnImage = useCallback((idx: number) => {
    setOwnImages((prev) => {
      const img = prev[idx];
      if (img) {
        const supabase = createClient();
        supabase.storage
          .from("postime-images")
          .remove([img.path])
          .catch(() => {});
      }
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const uploadWatermark = useCallback(
    async (file: File) => {
      setWatermarkError(null);
      if (file.type !== "image/png") {
        setWatermarkError("A logo precisa ser um arquivo PNG.");
        return;
      }
      setWatermarkUploading(true);
      try {
        const inspection = await inspectWatermarkPng(file);
        if (!inspection) {
          setWatermarkError("Não foi possível ler esse PNG. Tente outro arquivo.");
          return;
        }
        // Not transparent doesn't block the upload anymore — a lot of real logos
        // (exported from Canva, Word, a screenshot) fail this strict per-pixel
        // check even when they look fine to the eye, and blocking outright made
        // watermark upload feel broken for those users. It still renders (as a
        // solid box behind the logo instead of a clean overlay), so warn instead.
        let transparencyWarning: string | null = null;
        if (!inspection.transparent) {
          transparencyWarning =
            "Esse PNG não tem fundo transparente de verdade — ele vai aparecer com um fundo sólido no vídeo. Pra um resultado limpo, exporte a logo com fundo transparente (ex: remove.bg).";
        }
        if (inspection.width < WATERMARK_MIN_DIMENSION_PX || inspection.height < WATERMARK_MIN_DIMENSION_PX) {
          setWatermarkError(
            `A imagem é muito pequena (${inspection.width}x${inspection.height}px). Envie pelo menos ${WATERMARK_MIN_DIMENSION_PX}x${WATERMARK_MIN_DIMENSION_PX}px.`,
          );
          return;
        }
        const supabase = createClient();
        const path = `${userId}/watermark.png`;
        const { error: upErr } = await supabase.storage
          .from("postime-images")
          .upload(path, file, { contentType: "image/png", upsert: true });
        if (upErr) {
          setWatermarkError("Não foi possível enviar a logo agora. Tente novamente.");
          return;
        }
        const { data: signed } = await supabase.storage
          .from("postime-images")
          .createSignedUrl(path, 60 * 60 * 24);
        if (signed?.signedUrl) {
          setWatermark({ url: signed.signedUrl, path });
          if (transparencyWarning) setWatermarkError(transparencyWarning);
        }
      } catch {
        setWatermarkError("Falha de conexão. Tente novamente.");
      } finally {
        setWatermarkUploading(false);
      }
    },
    [userId],
  );

  const removeWatermark = useCallback(() => {
    setWatermark((prev) => {
      if (prev) {
        const supabase = createClient();
        supabase.storage
          .from("postime-images")
          .remove([prev.path])
          .catch(() => {});
      }
      return null;
    });
    setWatermarkError(null);
  }, []);

  const setDuration = useCallback(
    (d: Duration) => {
      if (!allowedDurations.includes(d)) return;
      setDurationState(d);
    },
    [allowedDurations],
  );

  const qtyMax = useCallback(() => 20, []);

  const setQty = useCallback(
    (v: number) => {
      const max = qtyMax();
      setQtyState(Math.min(max, Math.max(1, v)));
    },
    [qtyMax],
  );

  const openUpgradeModal = useCallback(() => {
    openModal({ type: "upgrade" });
  }, [openModal]);

  const resetVideoTracking = useCallback((n: number) => {
    setScriptIndex(0);
    setSavedTemas(new Array(n).fill(false));
    setUsedTemas(new Array(n).fill(false));
    setFailedTemas(new Array(n).fill(false));
    setDeletedTemas(new Array(n).fill(false));
    setSelectedForVideo([]);
    setAudioPaths(new Array(n).fill(null));
    setAudioDurationByTema(new Array(n).fill(null));
    setSceneSecondsByTema(new Array(n).fill(3));
    setMusicMoodByTema(new Array(n).fill("auto"));
    setImageThemeByTema(new Array(n).fill("auto"));
    setImageAssignmentsByTema(Array.from({ length: n }, () => []));
    setTitleCuesByTema(Array.from({ length: n }, () => []));
    setSubtitleCuesByTema(Array.from({ length: n }, () => []));
  }, []);

  // Roteiros only lived in this React tree's memory until now — a refresh or a
  // new session lost every tema that hadn't already turned into a video, which
  // broke the "build one video at a time, come back later for the rest"
  // workflow. draftLoaded gates the autosave effect below so the empty initial
  // state (before this load resolves) never overwrites a real saved draft.
  const draftLoaded = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/roteiros/draft");
        if (!res.ok || cancelled) return;
        const { draft } = await res.json();
        if (!draft || !Array.isArray(draft.roteiros) || draft.roteiros.length === 0 || cancelled) return;
        const n = draft.roteiros.length;
        resetVideoTracking(n);
        setRoteiros(draft.roteiros);
        setUsedTemas(Array.isArray(draft.usedTemas) && draft.usedTemas.length === n ? draft.usedTemas : new Array(n).fill(false));
        setFailedTemas(Array.isArray(draft.failedTemas) && draft.failedTemas.length === n ? draft.failedTemas : new Array(n).fill(false));
        setAudioPaths(Array.isArray(draft.audioPaths) && draft.audioPaths.length === n ? draft.audioPaths : new Array(n).fill(null));
        setAudioDurationByTema(
          Array.isArray(draft.audioDurations) && draft.audioDurations.length === n
            ? draft.audioDurations
            : new Array(n).fill(null),
        );
      } catch {
        // best-effort — an unrestored draft just means starting fresh, not a hard error
      } finally {
        draftLoaded.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftLoaded.current) return;
    const timer = setTimeout(() => {
      fetch("/api/roteiros/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roteiros,
          usedTemas,
          failedTemas,
          audioPaths,
          audioDurations: audioDurationByTema,
        }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [roteiros, usedTemas, failedTemas, audioPaths, audioDurationByTema]);

  const applyVideos = useCallback(
    (next: Omit<Video, "id">[], status: string) => {
      // Merge by temaIndex instead of replacing the whole list — otherwise
      // rebuilding just one regravado tema would wipe every other video already
      // sitting in the Download list, even though their files are still alive
      // in storage until their TTL. Keep everything not touched by this batch.
      setVideos((prev) => {
        const nextWithIds = next.map((v) => ({ ...v, id: crypto.randomUUID() }));
        const nextTemaIndexes = new Set(nextWithIds.map((v) => v.temaIndex));
        const kept = prev.filter((v) => !nextTemaIndexes.has(v.temaIndex));
        return [...kept, ...nextWithIds].sort((a, b) => a.temaIndex - b.temaIndex);
      });
      setVideoCountStatus(status);
      if (next.length > 0 && !whatsappPromptShown.current) {
        whatsappPromptShown.current = true;
        // Don't clobber a modal that opened in the meantime (e.g. the "regravar"
        // alert for a failed video) — only take the slot if it's still free.
        setTimeout(() => setModal((current) => (current.type === null ? { type: "whatsapp" } : current)), 600);
      }
    },
    [],
  );

  const editRoteiroText = useCallback((idx: number, text: string) => {
    setRoteiros((prev) => prev.map((r, i) => (i === idx ? { ...r, text } : r)));
  }, []);

  const requestSourceText = useCallback(
    () => (sourceType === "texto" ? texto : sourceLabel() ?? ""),
    [sourceType, texto, sourceLabel],
  );

  const clickGerar = useCallback(async () => {
    const n = qty || 1;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/roteiros/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: n, duration, sourceType, sourceText: requestSourceText() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "access_locked") {
          openModal({ type: "upgrade" });
        } else if (data.error === "duration_not_allowed") {
          setGenerateError("Essa duração só está disponível nos primeiros 7 dias ou com assinatura ativa.");
        } else if (data.error === "invalid_key") {
          setGenerateError("Sua chave de API parece inválida. Verifique em Minha conta.");
        } else {
          setGenerateError("Não foi possível gerar agora. Tente novamente.");
        }
        return;
      }
      setRoteiros(data.roteiros);
      resetVideoTracking(data.roteiros.length);
    } catch {
      setGenerateError("Falha de conexão. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }, [qty, duration, sourceType, requestSourceText, openModal, resetVideoTracking]);

  const regenerateRoteiro = useCallback(
    async (idx: number) => {
      setRegeneratingIndex(idx);
      setGenerateError(null);
      try {
        const res = await fetch("/api/roteiros/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qty: 1, duration, sourceType, sourceText: requestSourceText() }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === "access_locked") {
            openModal({ type: "upgrade" });
          } else if (data.error === "duration_not_allowed") {
            setGenerateError("Essa duração só está disponível nos primeiros 7 dias ou com assinatura ativa.");
          } else {
            setGenerateError("Não foi possível regenerar agora.");
          }
          return;
        }
        const [newRoteiro] = data.roteiros;
        if (newRoteiro) setRoteiros((prev) => prev.map((r, i) => (i === idx ? newRoteiro : r)));
      } catch {
        setGenerateError("Falha de conexão. Tente novamente.");
      } finally {
        setRegeneratingIndex(null);
      }
    },
    [duration, sourceType, requestSourceText, openModal],
  );

  const uploadRecording = useCallback(
    async (idx: number, file: Blob, ext: string): Promise<boolean> => {
      setAudioUploading(true);
      setAudioError(null);
      try {
        const [supabase, durationSeconds] = await Promise.all([
          Promise.resolve(createClient()),
          readAudioDuration(file),
        ]);
        const path = `${userId}/${idx}.${ext}`;
        const { error } = await supabase.storage
          .from("postime-audio")
          .upload(path, file, { upsert: true, contentType: file.type || undefined });
        if (error) {
          setAudioError("Não foi possível salvar o áudio agora. Tente novamente.");
          return false;
        }
        setAudioPaths((prev) => {
          const next = [...prev];
          next[idx] = path;
          return next;
        });
        setAudioDurationByTema((prev) => {
          const next = [...prev];
          next[idx] = durationSeconds;
          return next;
        });
        setSavedTemas((prev) => prev.map((v, i) => (i === idx ? true : v)));
        setScriptIndex((i) => Math.min(i + 1, roteiros.length - 1));
        return true;
      } catch {
        setAudioError("Falha de conexão. Tente novamente.");
        return false;
      } finally {
        setAudioUploading(false);
      }
    },
    [userId, roteiros.length],
  );

  /**
   * Marks a tema as ready for video without a recording — no audioPaths entry
   * is set, so the render pipeline falls back to showing the roteiro text as
   * captions across the whole video instead of syncing to narration.
   */
  const skipAudio = useCallback(
    (idx: number) => {
      setSavedTemas((prev) => prev.map((v, i) => (i === idx ? true : v)));
      setScriptIndex((i) => Math.min(i + 1, roteiros.length - 1));
    },
    [roteiros.length],
  );

  /**
   * Undoes a tema's saved recording (whether it was a real audio take or a
   * skipped/text-only entry) so it goes back through the recording flow —
   * the only way today to fix a video that failed to render, without having
   * to regenerate the roteiro text from scratch.
   */
  const retryRecording = useCallback((idx: number) => {
    setSavedTemas((prev) => prev.map((v, i) => (i === idx ? false : v)));
    setUsedTemas((prev) => prev.map((v, i) => (i === idx ? false : v)));
    setFailedTemas((prev) => prev.map((v, i) => (i === idx ? false : v)));
    // A "Regravar" button on the Download page can target a tema that was
    // since deleted from the Gravação list — un-delete it so the flow lands
    // somewhere visible instead of a hidden tema.
    setDeletedTemas((prev) => prev.map((v, i) => (i === idx ? false : v)));
    setAudioPaths((prev) => prev.map((v, i) => (i === idx ? null : v)));
    setAudioDurationByTema((prev) => prev.map((v, i) => (i === idx ? null : v)));
    setSelectedForVideo((prev) => prev.filter((i) => i !== idx));
    setScriptIndex(idx);
  }, []);

  /**
   * Lets the user discard a video they don't like, not just a failed one —
   * deletes the rendered file immediately (best-effort; the UI resets either
   * way) and sends the tema back through the recording flow via retryRecording.
   */
  const retryVideo = useCallback(
    (video: Video) => {
      if (video.videoPath) {
        fetch("/api/jobs/render", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoPath: video.videoPath }),
        }).catch(() => {});
      }
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      retryRecording(video.temaIndex);
    },
    [retryRecording],
  );

  /**
   * Pure delete, unlike retryVideo: removes the rendered file and the card from
   * the list, but leaves the tema's recording/roteiro alone and doesn't route
   * the user back into Gravação — un-marks it as "used" so it's simply free to
   * pick again later on the Estilo tema list if they want another shot at it.
   */
  const deleteVideo = useCallback((video: Video) => {
    if (video.videoPath) {
      fetch("/api/jobs/render", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoPath: video.videoPath }),
      }).catch(() => {});
    }
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    setUsedTemas((prev) => prev.map((v, i) => (i === video.temaIndex ? false : v)));
  }, []);

  /**
   * Marks a tema as deleted instead of splicing it out of the parallel arrays —
   * a real removal would shift every later index and break the temaIndex a
   * built Video already points at (e.g. the Download page's "Regravar" button).
   * The tema just gets hidden everywhere and skipped during recording/build.
   */
  const deleteRoteiro = useCallback(
    (idx: number) => {
      const audioPath = audioPaths[idx];
      if (audioPath) {
        const supabase = createClient();
        supabase.storage
          .from("postime-audio")
          .remove([audioPath])
          .catch(() => {});
      }
      setDeletedTemas((prev) => prev.map((v, i) => (i === idx ? true : v)));
      setSelectedForVideo((prev) => prev.filter((i) => i !== idx));
      setScriptIndex((i) => (i === idx ? Math.min(i + 1, roteiros.length - 1) : i));
    },
    [audioPaths, roteiros.length],
  );

  const toggleSelectedForVideo = useCallback((idx: number) => {
    setSelectedForVideo((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  }, []);

  const confirmBuild = useCallback(async (): Promise<{
    ok: boolean;
    failedIndices: number[];
    dailyLimitHit: boolean;
  }> => {
    if (selectedForVideo.length === 0) return { ok: false, failedIndices: [], dailyLimitHit: false };
    const indices = [...selectedForVideo].sort((a, b) => a - b);
    setBuildingVideos(true);
    setBuildError(null);
    try {
      // Segment 0 (the cover / Download thumbnail) uses whatever the user assigned
      // there in the "Fotos por vídeo" picker; only temas left on "Automático" for
      // that slot need a stock search here — same batch call as before.
      const ownCovers = new Map<number, string>();
      indices.forEach((i) => {
        const cover = imageAssignmentsByTema[i]?.[0];
        if (cover) ownCovers.set(i, cover);
      });
      const unmatchedIndices = indices.filter((i) => !ownCovers.has(i));

      let fetchedImages: ({ url: string; photographer: string } | null)[] = [];
      if (unmatchedIndices.length > 0) {
        const queries = unmatchedIndices.map((i) => roteiros[i]?.imageQuery || roteiros[i]?.text || "");
        const themes = unmatchedIndices.map((i) => themeQueryFor(imageThemeByTema[i]));
        const res = await fetch("/api/scenes/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queries, themes }),
        });
        const data = await res.json();
        if (!res.ok) {
          setBuildError("Não foi possível buscar as imagens agora. Tente novamente.");
          return { ok: false, failedIndices: [], dailyLimitHit: false };
        }
        fetchedImages = data.images;
      }

      const imageByIndex = new Map<number, { url: string; photographer: string }>();
      unmatchedIndices.forEach((i, pos) => {
        const img = fetchedImages[pos];
        if (img) imageByIndex.set(i, img);
      });
      ownCovers.forEach((url, i) => imageByIndex.set(i, { url, photographer: "Sua foto" }));

      let dailyLimitHit = false;
      setBuildProgress({ completed: 0, total: indices.length });
      // Rendered one at a time, not in parallel — concurrent ffmpeg jobs were
      // contending for the same limited server resources and causing renders
      // to fail; sequential requests are slower but reliable.
      const built: Omit<Video, "id">[] = [];
      for (let pos = 0; pos < indices.length; pos++) {
        const i = indices[pos];
        const image = imageByIndex.get(i);
        const base: Omit<Video, "id"> = {
          title: `Tema ${String(i + 1).padStart(2, "0")} · ${selectedStyle}`,
          temaIndex: i,
          style: selectedStyle,
          imageUrl: image?.url,
          imageCredit: image?.photographer,
        };
        const result = await (async (): Promise<Omit<Video, "id">> => {
          const audioPath = audioPaths[i];
          if (!image?.url || dailyLimitHit) return base;
          try {
            const renderRes = await fetch("/api/jobs/render", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioPath,
                imageUrl: image.url,
                ownImageUrls: imageAssignmentsByTema[i] ?? [],
                text: roteiros[i]?.text ?? "",
                style: selectedStyle,
                mood: (musicMoodByTema[i] ?? "auto") === "auto" ? roteiros[i]?.mood : musicMoodByTema[i],
                sceneSeconds: sceneSecondsByTema[i] ?? 3,
                imageTheme: themeQueryFor(imageThemeByTema[i]),
                narrationVolume,
                musicVolume: musicVolume ?? undefined,
                captionColor,
                captionSize,
                captionFont,
                captionShadow,
                captionBackground,
                captionPositionY: captionPositionY ?? undefined,
                titleCues: (titleCuesByTema[i] ?? [])
                  .filter((c) => c.text.trim())
                  .map((c) => ({ text: c.text.trim(), start: c.start, end: c.end })),
                titleAlign,
                titleColor,
                titleSize,
                titleFont,
                titleShadow,
                subtitleCues: (subtitleCuesByTema[i] ?? [])
                  .filter((c) => c.text.trim())
                  .map((c) => ({ text: c.text.trim(), start: c.start, end: c.end })),
                subtitleAlign,
                subtitleColor,
                subtitleSize,
                subtitleFont,
                subtitleShadow,
                watermarkPath: watermark?.path,
                watermarkPosition,
              }),
            });
            const renderData = await renderRes.json();
            if (!renderRes.ok) {
              if (renderData?.error === "daily_video_limit_reached") dailyLimitHit = true;
              return base;
            }
            return {
              ...base,
              videoUrl: renderData.videoUrl,
              videoPath: renderData.videoPath,
              expiresAt: renderData.expiresAt,
              durationSeconds: renderData.durationSeconds,
            };
          } catch {
            return base;
          }
        })();
        built.push(result);
        setBuildProgress({ completed: pos + 1, total: indices.length });
      }
      const label = sourceLabel() ?? "fonte selecionada";
      applyVideos(built, `${indices.length} vídeos gerados hoje · estilo ${selectedStyle} · fonte: ${label}`);

      // A video without a videoUrl wasn't actually delivered. Only lock a tema as
      // "used" when it truly produced a video — otherwise it stays stuck forever
      // with no way to fix it short of regenerating the roteiro from scratch.
      // Videos cut off by the daily limit aren't a recording problem, so they're
      // excluded from the "regravar" prompt — they just stay unlocked to retry later.
      const deliveredIndices = new Set(built.filter((v) => v.videoUrl).map((v) => v.temaIndex));
      const failedIndices = dailyLimitHit ? [] : indices.filter((i) => !deliveredIndices.has(i));
      setUsedTemas((prev) => prev.map((v, i) => (deliveredIndices.has(i) ? true : v)));
      setFailedTemas((prev) =>
        prev.map((v, i) => (failedIndices.includes(i) ? true : indices.includes(i) ? false : v)),
      );
      setSelectedForVideo([]);
      if (dailyLimitHit) {
        setBuildError("Você atingiu o limite de vídeos de hoje. Volte amanhã ou assine para continuar sem limite.");
      }
      return { ok: true, failedIndices, dailyLimitHit };
    } catch {
      setBuildError("Falha de conexão. Tente novamente.");
      return { ok: false, failedIndices: [], dailyLimitHit: false };
    } finally {
      setBuildProgress(null);
      setBuildingVideos(false);
    }
  }, [
    selectedForVideo,
    selectedStyle,
    sceneSecondsByTema,
    musicMoodByTema,
    imageThemeByTema,
    narrationVolume,
    musicVolume,
    captionColor,
    captionSize,
    captionFont,
    captionShadow,
    captionBackground,
    captionPositionY,
    titleCuesByTema,
    titleAlign,
    titleColor,
    titleSize,
    titleFont,
    titleShadow,
    subtitleCuesByTema,
    subtitleAlign,
    subtitleColor,
    subtitleSize,
    subtitleFont,
    subtitleShadow,
    sourceLabel,
    applyVideos,
    roteiros,
    audioPaths,
    imageAssignmentsByTema,
    watermark,
    watermarkPosition,
  ]);

  const connectEleven = useCallback((name: string) => {
    setVoiceCloned(true);
    setSelectedVoiceName(name);
  }, []);

  const saveWhatsapp = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const accountInitials = useCallback(() => {
    const parts = accountName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [accountName]);

  const setAccountName = useCallback((name: string) => {
    setAccountNameState(name);
    const supabase = createClient();
    supabase.auth.updateUser({ data: { full_name: name } });
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const value = useMemo<WizardContextValue>(
    () => ({
      accountName,
      accessPhase,
      phaseDaysLeft,
      isSubscribed,
      dailyVideoLimit,
      allowedDurations,
      voiceCloned,
      selectedVoiceName,
      hasOwnKey,
      ownKeyProvider,
      savingKey,
      keyError,
      generating,
      generateError,
      regeneratingIndex,
      sourceType,
      ebookFileName,
      texto,
      link,
      youtube,
      websearch,
      ownImages,
      ownImagesUploading,
      ownImagesError,
      duration,
      qty,
      roteiros,
      scriptIndex,
      savedTemas,
      usedTemas,
      failedTemas,
      deletedTemas,
      selectedForVideo,
      audioPaths,
      audioDurationByTema,
      audioUploading,
      audioError,
      imageAssignmentsByTema,
      titleCuesByTema,
      subtitleCuesByTema,
      selectedStyle,
      sceneSecondsByTema,
      musicMoodByTema,
      imageThemeByTema,
      narrationVolume,
      musicVolume,
      captionColor,
      captionSize,
      captionFont,
      captionShadow,
      captionBackground,
      captionPositionY,
      titleAlign,
      titleColor,
      titleSize,
      titleFont,
      titleShadow,
      subtitleAlign,
      subtitleColor,
      subtitleSize,
      subtitleFont,
      subtitleShadow,
      watermark,
      watermarkPosition,
      watermarkUploading,
      watermarkError,
      videos,
      videoCountStatus,
      buildingVideos,
      buildProgress,
      buildError,
      modal,
      userEmail,
      setAccountName,
      accountInitials,
      signOut,
      setSourceType,
      setEbookFileName,
      setTexto,
      setLink,
      setYoutube,
      setWebsearch,
      addOwnImages,
      removeOwnImage,
      sourceLabel,
      assignedOwnImageUrls,
      neededSegmentsForTema,
      segmentTextsForTema,
      setImageAssignment,
      addTitleCue,
      updateTitleCue,
      removeTitleCue,
      addSubtitleCue,
      updateSubtitleCue,
      removeSubtitleCue,
      setDuration,
      setQty,
      qtyMax,
      openUpgradeModal,
      refreshUsage,
      saveOwnKey,
      removeOwnKey,
      editRoteiroText,
      regenerateRoteiro,
      clickGerar,
      setScriptIndex,
      uploadRecording,
      skipAudio,
      retryRecording,
      retryVideo,
      deleteVideo,
      deleteRoteiro,
      toggleSelectedForVideo,
      setSelectedStyle,
      setNarrationVolume,
      setMusicVolume,
      setCaptionColor,
      setCaptionSize,
      setCaptionFont,
      setCaptionShadow,
      setCaptionBackground,
      setCaptionPositionY,
      setTitleAlign,
      setTitleColor,
      setTitleSize,
      setTitleFont,
      setTitleShadow,
      setSubtitleAlign,
      setSubtitleColor,
      setSubtitleSize,
      setSubtitleFont,
      setSubtitleShadow,
      setSceneSecondsForTema,
      setMusicMoodForTema,
      setImageThemeForTema,
      uploadWatermark,
      removeWatermark,
      setWatermarkPosition,
      confirmBuild,
      connectEleven,
      saveWhatsapp,
      openModal,
      closeModal,
    }),
    [
      accountName,
      accessPhase,
      phaseDaysLeft,
      isSubscribed,
      dailyVideoLimit,
      allowedDurations,
      voiceCloned,
      selectedVoiceName,
      hasOwnKey,
      ownKeyProvider,
      savingKey,
      keyError,
      generating,
      generateError,
      regeneratingIndex,
      sourceType,
      ebookFileName,
      texto,
      link,
      youtube,
      websearch,
      ownImages,
      ownImagesUploading,
      ownImagesError,
      duration,
      qty,
      roteiros,
      scriptIndex,
      savedTemas,
      usedTemas,
      failedTemas,
      deletedTemas,
      selectedForVideo,
      audioPaths,
      audioDurationByTema,
      audioUploading,
      audioError,
      imageAssignmentsByTema,
      titleCuesByTema,
      subtitleCuesByTema,
      selectedStyle,
      sceneSecondsByTema,
      musicMoodByTema,
      imageThemeByTema,
      narrationVolume,
      musicVolume,
      captionColor,
      captionSize,
      captionFont,
      captionShadow,
      captionBackground,
      captionPositionY,
      titleAlign,
      titleColor,
      titleSize,
      titleFont,
      titleShadow,
      subtitleAlign,
      subtitleColor,
      subtitleSize,
      subtitleFont,
      subtitleShadow,
      watermark,
      watermarkPosition,
      watermarkUploading,
      watermarkError,
      videos,
      videoCountStatus,
      buildingVideos,
      buildProgress,
      buildError,
      modal,
      userEmail,
      setAccountName,
      accountInitials,
      signOut,
      addOwnImages,
      removeOwnImage,
      sourceLabel,
      assignedOwnImageUrls,
      neededSegmentsForTema,
      segmentTextsForTema,
      setImageAssignment,
      addTitleCue,
      updateTitleCue,
      removeTitleCue,
      addSubtitleCue,
      updateSubtitleCue,
      removeSubtitleCue,
      setDuration,
      setQty,
      qtyMax,
      openUpgradeModal,
      refreshUsage,
      saveOwnKey,
      removeOwnKey,
      editRoteiroText,
      regenerateRoteiro,
      clickGerar,
      uploadRecording,
      skipAudio,
      retryRecording,
      retryVideo,
      deleteVideo,
      deleteRoteiro,
      toggleSelectedForVideo,
      setSceneSecondsForTema,
      setMusicMoodForTema,
      setImageThemeForTema,
      uploadWatermark,
      removeWatermark,
      setWatermarkPosition,
      confirmBuild,
      connectEleven,
      saveWhatsapp,
      openModal,
      closeModal,
    ],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within a WizardProvider");
  return ctx;
}
