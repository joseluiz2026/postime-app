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
import {
  type AccessPhase,
  type Duration,
  allowedDurationsFor,
  dailyVideoLimitFor,
  getAccessPhase,
  getPhaseDaysLeft,
} from "./plan";
import { createClient } from "./supabase/client";

export type { Duration } from "./plan";
export type SourceType = "ebook" | "texto" | "link" | "youtube" | "websearch";
export type StyleName =
  | "Minimalista"
  | "Dinâmico"
  | "Cinematográfico"
  | "Neon Bold"
  | "Kinetic Text"
  | "Split Screen";

export type OwnImage = { name: string; url: string };
export type Roteiro = { meta: string; text: string; mood?: MusicMood };
// Core's video output is deliberately blind to distribution (see lib/distribution-context.tsx) —
// it exposes an id so a channel-connect module can reference "which video", nothing about
// publish state itself.
export type Video = {
  id: string;
  title: string;
  style?: string;
  imageUrl?: string;
  imageCredit?: string;
  videoUrl?: string;
  expiresAt?: string;
  durationSeconds?: number;
};

export type ModalId =
  | "upgrade"
  | "eleven"
  | "account"
  | "whatsapp"
  | "tiktok"
  | "autoProgress";

export type AccountModalType = "password" | "report" | "faq" | "support";

type ModalState =
  | { type: null }
  | { type: "upgrade" }
  | { type: "eleven" }
  | { type: "account"; accountType: AccountModalType }
  | { type: "whatsapp" }
  | { type: "tiktok" }
  | { type: "autoProgress"; onDone: () => void | Promise<void> };

function normalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[_-]+/g, " ")
    .replace(/\.[a-z0-9]+$/, "")
    .trim();
}

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

  // roteiros
  duration: Duration;
  qty: number;
  roteiros: Roteiro[];

  // gravação
  scriptIndex: number;
  savedTemas: boolean[];
  usedTemas: boolean[];
  selectedForVideo: number[];
  audioPaths: (string | null)[];
  audioUploading: boolean;
  audioError: string | null;

  // estilo
  selectedStyle: StyleName;

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
  addOwnImages: (files: FileList) => void;
  removeOwnImage: (idx: number) => void;
  sourceLabel: () => string | null;
  matchedOwnImageIndices: () => Set<number>;

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
  toggleSelectedForVideo: (idx: number) => void;

  setSelectedStyle: (s: StyleName) => void;
  confirmBuild: () => Promise<boolean>;
  buildingVideos: boolean;
  buildError: string | null;

  clickAutoGenerate: () => void;

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

  const [duration, setDurationState] = useState<Duration>("15s");
  const [qty, setQtyState] = useState(3);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);

  const [scriptIndex, setScriptIndex] = useState(0);
  const [savedTemas, setSavedTemas] = useState<boolean[]>([]);
  const [usedTemas, setUsedTemas] = useState<boolean[]>([]);
  const [selectedForVideo, setSelectedForVideo] = useState<number[]>([]);
  const [audioPaths, setAudioPaths] = useState<(string | null)[]>([]);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] = useState<StyleName>("Minimalista");

  const [videos, setVideos] = useState<Video[]>([]);
  const [videoCountStatus, setVideoCountStatus] = useState("");
  const [buildingVideos, setBuildingVideos] = useState(false);
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

  const matchedOwnImageIndices = useCallback((): Set<number> => {
    const roteiroText = roteiros.map((r) => normalizeForMatch(r.text)).join(" ");
    const set = new Set<number>();
    ownImages.forEach((img, idx) => {
      const baseName = normalizeForMatch(img.name);
      if (baseName.length > 2 && roteiroText.includes(baseName)) set.add(idx);
    });
    return set;
  }, [ownImages, roteiros]);

  const addOwnImages = useCallback((files: FileList) => {
    const next: OwnImage[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      next.push({ name: file.name, url: URL.createObjectURL(file) });
    });
    setOwnImages((prev) => [...prev, ...next]);
  }, []);

  const removeOwnImage = useCallback((idx: number) => {
    setOwnImages((prev) => {
      const img = prev[idx];
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter((_, i) => i !== idx);
    });
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
    setSelectedForVideo([]);
    setAudioPaths(new Array(n).fill(null));
  }, []);

  const applyVideos = useCallback(
    (next: Omit<Video, "id">[], status: string) => {
      setVideos(next.map((v) => ({ ...v, id: crypto.randomUUID() })));
      setVideoCountStatus(status);
      if (next.length > 0 && !whatsappPromptShown.current) {
        whatsappPromptShown.current = true;
        setTimeout(() => openModal({ type: "whatsapp" }), 600);
      }
    },
    [openModal],
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
        const supabase = createClient();
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

  const toggleSelectedForVideo = useCallback((idx: number) => {
    setSelectedForVideo((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  }, []);

  const confirmBuild = useCallback(async (): Promise<boolean> => {
    if (selectedForVideo.length === 0) return false;
    const indices = [...selectedForVideo].sort((a, b) => a - b);
    setBuildingVideos(true);
    setBuildError(null);
    try {
      const queries = indices.map((i) => roteiros[i]?.text ?? "");
      const res = await fetch("/api/scenes/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBuildError("Não foi possível buscar as imagens agora. Tente novamente.");
        return false;
      }
      const images: ({ url: string; photographer: string } | null)[] = data.images;
      let dailyLimitHit = false;
      const built: Omit<Video, "id">[] = await Promise.all(
        indices.map(async (i, pos): Promise<Omit<Video, "id">> => {
          const image = images[pos];
          const base: Omit<Video, "id"> = {
            title: `Tema ${String(i + 1).padStart(2, "0")} · ${selectedStyle}`,
            style: selectedStyle,
            imageUrl: image?.url,
            imageCredit: image?.photographer,
          };
          const audioPath = audioPaths[i];
          if (!image?.url || dailyLimitHit) return base;
          try {
            const renderRes = await fetch("/api/jobs/render", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioPath,
                imageUrl: image.url,
                text: roteiros[i]?.text ?? "",
                style: selectedStyle,
                mood: roteiros[i]?.mood,
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
              expiresAt: renderData.expiresAt,
              durationSeconds: renderData.durationSeconds,
            };
          } catch {
            return base;
          }
        }),
      );
      const label = sourceLabel() ?? "fonte selecionada";
      applyVideos(built, `${indices.length} vídeos gerados hoje · estilo ${selectedStyle} · fonte: ${label}`);
      setUsedTemas((prev) => prev.map((v, i) => (indices.includes(i) ? true : v)));
      setSelectedForVideo([]);
      if (dailyLimitHit) {
        setBuildError("Você atingiu o limite de vídeos de hoje. Volte amanhã ou assine para continuar sem limite.");
      }
      return true;
    } catch {
      setBuildError("Falha de conexão. Tente novamente.");
      return false;
    } finally {
      setBuildingVideos(false);
    }
  }, [selectedForVideo, selectedStyle, sourceLabel, applyVideos, roteiros, audioPaths]);

  const clickAutoGenerate = useCallback(() => {
    if (accessPhase === "locked") {
      openModal({ type: "upgrade" });
      return;
    }
    const n = 3;
    openModal({
      type: "autoProgress",
      onDone: async () => {
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
            } else {
              setGenerateError("Não foi possível gerar agora.");
            }
            return;
          }
          setRoteiros(data.roteiros);
          resetVideoTracking(data.roteiros.length);
          setSavedTemas(new Array(data.roteiros.length).fill(true));
          const label = sourceLabel() ?? "fonte selecionada";
          applyVideos(
            data.roteiros.map((_: Roteiro, i: number) => ({ title: `Tema ${String(i + 1).padStart(2, "0")}` })),
            `${data.roteiros.length} vídeos gerados hoje · fonte: ${label}`,
          );
        } catch {
          setGenerateError("Falha de conexão. Tente novamente.");
        } finally {
          setGenerating(false);
          closeModal();
        }
      },
    });
  }, [accessPhase, duration, sourceType, requestSourceText, openModal, resetVideoTracking, sourceLabel, applyVideos, closeModal]);

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
      duration,
      qty,
      roteiros,
      scriptIndex,
      savedTemas,
      usedTemas,
      selectedForVideo,
      audioPaths,
      audioUploading,
      audioError,
      selectedStyle,
      videos,
      videoCountStatus,
      buildingVideos,
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
      matchedOwnImageIndices,
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
      toggleSelectedForVideo,
      setSelectedStyle,
      confirmBuild,
      clickAutoGenerate,
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
      duration,
      qty,
      roteiros,
      scriptIndex,
      savedTemas,
      usedTemas,
      selectedForVideo,
      audioPaths,
      audioUploading,
      audioError,
      selectedStyle,
      videos,
      videoCountStatus,
      buildingVideos,
      buildError,
      modal,
      userEmail,
      setAccountName,
      accountInitials,
      signOut,
      addOwnImages,
      removeOwnImage,
      sourceLabel,
      matchedOwnImageIndices,
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
      toggleSelectedForVideo,
      confirmBuild,
      clickAutoGenerate,
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
