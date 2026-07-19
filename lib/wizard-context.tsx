"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getFreeLimit, type Plan } from "./plan";

export type SourceType = "ebook" | "texto" | "link" | "youtube" | "websearch";
export type StyleName =
  | "Minimalista"
  | "Dinâmico"
  | "Cinematográfico"
  | "Neon Bold"
  | "Kinetic Text"
  | "Split Screen";
export type Duration = "15s" | "30s" | "60s";

export type OwnImage = { name: string; url: string };
export type Roteiro = { meta: string; text: string };
export type Video = {
  title: string;
  style?: string;
  publishing?: boolean;
  published?: boolean;
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
  | { type: "upgrade"; auto?: boolean }
  | { type: "eleven" }
  | { type: "account"; accountType: AccountModalType }
  | { type: "whatsapp" }
  | { type: "tiktok" }
  | { type: "autoProgress"; onDone: () => void };

const RT_TEXT_TEMPLATES = [
  "Roteiro gerado automaticamente a partir do tema principal identificado no material enviado.",
  "Tema identificado, com gancho reformulado para reter atenção nos primeiros três segundos.",
  "Roteiro com fechamento em pergunta para estimular comentários e compartilhamento.",
  "Recorte direto da fonte, adaptado para ritmo rápido e linguagem de rede social.",
  "Ideia central reescrita em formato de lista, fácil de acompanhar em vídeo curto.",
  "Abertura de impacto seguida de exemplo prático extraído do material original.",
  "Comparação antes/depois construída a partir de um trecho da fonte selecionada.",
  "Roteiro com chamada direta para seguir o perfil ao final do vídeo.",
  "Mini-tutorial baseado em um passo específico identificado na fonte.",
  "Roteiro de bastidor, com tom mais pessoal, extraído do contexto da fonte.",
];

function makeRoteiros(n: number): Roteiro[] {
  return Array.from({ length: n }, (_, i) => ({
    meta: `TEMA ${String(i + 1).padStart(2, "0")} · EXTRAÍDO DA FONTE`,
    text: RT_TEXT_TEMPLATES[i % RT_TEXT_TEMPLATES.length],
  }));
}

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
  plan: Plan;
  freeDay: number;
  dailyGenerated: number;
  voiceCloned: boolean;
  selectedVoiceName: string;
  tiktokConnected: boolean;
  tiktokHandle: string;

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

  // estilo
  selectedStyle: StyleName;

  // download
  videos: Video[];
  videoCountStatus: string;

  modal: ModalState;
};

type WizardContextValue = WizardState & {
  setAccountName: (name: string) => void;
  accountInitials: () => string;

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

  setPlan: (p: Plan) => void;
  requestPro: () => void;
  confirmUpgrade: () => void;
  bumpFreeDay: (delta: number) => void;
  freeLimit: () => number;

  editRoteiroText: (idx: number, text: string) => void;
  regenerateRoteiro: (idx: number) => void;
  clickGerar: () => void;

  setScriptIndex: (i: number) => void;
  saveCurrentRecording: () => void;
  toggleSelectedForVideo: (idx: number) => void;

  setSelectedStyle: (s: StyleName) => void;
  confirmBuild: () => boolean;

  clickAutoGenerate: () => void;

  publishVideo: (idx: number) => void;

  connectEleven: (name: string) => void;
  connectTiktok: (handle: string) => void;
  saveWhatsapp: () => void;

  openModal: (m: ModalState) => void;
  closeModal: () => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [accountName, setAccountName] = useState("José Luiz Cruz");
  const [plan, setPlanState] = useState<Plan>("free");
  const [freeDay, setFreeDay] = useState(1);
  const [dailyGenerated, setDailyGenerated] = useState(0);
  const [voiceCloned, setVoiceCloned] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokHandle, setTiktokHandle] = useState("@seu.usuario");

  const [sourceType, setSourceType] = useState<SourceType>("ebook");
  const [ebookFileName, setEbookFileName] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [link, setLink] = useState("");
  const [youtube, setYoutube] = useState("");
  const [websearch, setWebsearch] = useState("");
  const [ownImages, setOwnImages] = useState<OwnImage[]>([]);

  const [duration, setDuration] = useState<Duration>("15s");
  const [qty, setQtyState] = useState(3);
  const [roteiros, setRoteiros] = useState<Roteiro[]>(makeRoteiros(3));

  const [scriptIndex, setScriptIndex] = useState(0);
  const [savedTemas, setSavedTemas] = useState<boolean[]>(new Array(3).fill(false));
  const [usedTemas, setUsedTemas] = useState<boolean[]>(new Array(3).fill(false));
  const [selectedForVideo, setSelectedForVideo] = useState<number[]>([]);

  const [selectedStyle, setSelectedStyle] = useState<StyleName>("Minimalista");

  const [videos, setVideos] = useState<Video[]>([]);
  const [videoCountStatus, setVideoCountStatus] = useState("");
  const whatsappPromptShown = useRef(false);

  const [modal, setModal] = useState<ModalState>({ type: null });
  const openModal = useCallback((m: ModalState) => setModal(m), []);
  const closeModal = useCallback(() => setModal({ type: null }), []);

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

  const freeLimit = useCallback(() => getFreeLimit(freeDay), [freeDay]);

  const qtyMax = useCallback(
    () => (plan === "pro" ? 20 : freeLimit()),
    [plan, freeLimit],
  );

  const setQty = useCallback(
    (v: number) => {
      const max = qtyMax();
      const min = max > 0 ? 1 : 0;
      setQtyState(Math.min(Math.max(max, 0), Math.max(min, v)));
    },
    [qtyMax],
  );

  const requestPro = useCallback(() => {
    openModal({ type: "upgrade" });
  }, [openModal]);

  const setPlan = useCallback(
    (p: Plan) => {
      if (p === "pro") {
        requestPro();
        return;
      }
      setPlanState(p);
    },
    [requestPro],
  );

  const confirmUpgrade = useCallback(() => {
    setPlanState("pro");
    closeModal();
  }, [closeModal]);

  const bumpFreeDay = useCallback((delta: number) => {
    setFreeDay((d) => Math.min(30, Math.max(1, d + delta)));
    setDailyGenerated(0);
  }, []);

  const resetVideoTracking = useCallback((n: number) => {
    setScriptIndex(0);
    setSavedTemas(new Array(n).fill(false));
    setUsedTemas(new Array(n).fill(false));
    setSelectedForVideo([]);
  }, []);

  const applyVideos = useCallback((next: Video[], status: string) => {
    setVideos(next);
    setVideoCountStatus(status);
    if (next.length > 0 && !whatsappPromptShown.current) {
      whatsappPromptShown.current = true;
      setTimeout(() => openModal({ type: "whatsapp" }), 600);
    }
  }, [openModal]);

  const generateRoteirosInternal = useCallback(
    (n: number) => {
      setRoteiros(makeRoteiros(n));
      resetVideoTracking(n);
    },
    [resetVideoTracking],
  );

  const editRoteiroText = useCallback((idx: number, text: string) => {
    setRoteiros((prev) => prev.map((r, i) => (i === idx ? { ...r, text } : r)));
  }, []);

  const regenerateRoteiro = useCallback((idx: number) => {
    setRoteiros((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              text: RT_TEXT_TEMPLATES[(RT_TEXT_TEMPLATES.indexOf(r.text) + 1 + RT_TEXT_TEMPLATES.length) % RT_TEXT_TEMPLATES.length],
            }
          : r,
      ),
    );
  }, []);

  const clickGerar = useCallback(() => {
    const n = qty || 1;
    const limit = freeLimit();
    if (plan === "free" && dailyGenerated + n > limit) {
      openModal({ type: "upgrade", auto: true });
      return;
    }
    generateRoteirosInternal(n);
    if (plan === "free") {
      const next = dailyGenerated + n;
      setDailyGenerated(next);
      if (next >= limit) openModal({ type: "upgrade", auto: true });
    }
  }, [qty, freeLimit, plan, dailyGenerated, generateRoteirosInternal, openModal]);

  const saveCurrentRecording = useCallback(() => {
    setSavedTemas((prev) => prev.map((v, i) => (i === scriptIndex ? true : v)));
    setScriptIndex((i) => Math.min(i + 1, roteiros.length - 1));
  }, [scriptIndex, roteiros.length]);

  const toggleSelectedForVideo = useCallback((idx: number) => {
    setSelectedForVideo((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  }, []);

  const confirmBuild = useCallback((): boolean => {
    if (selectedForVideo.length === 0) return false;
    const indices = [...selectedForVideo].sort((a, b) => a - b);
    const built: Video[] = indices.map((i) => ({
      title: `Tema ${String(i + 1).padStart(2, "0")} · ${selectedStyle}`,
      style: selectedStyle,
    }));
    const label = sourceLabel() ?? "fonte selecionada";
    applyVideos(
      built,
      `${indices.length} vídeos gerados hoje · estilo ${selectedStyle} · fonte: ${label}`,
    );
    setUsedTemas((prev) => prev.map((v, i) => (indices.includes(i) ? true : v)));
    setSelectedForVideo([]);
    return true;
  }, [selectedForVideo, selectedStyle, sourceLabel, applyVideos]);

  const clickAutoGenerate = useCallback(() => {
    const limit = plan === "free" ? freeLimit() : null;
    if (plan === "free" && limit === 0) {
      openModal({ type: "upgrade", auto: true });
      return;
    }
    const remaining = plan === "free" ? Math.max(0, (limit as number) - dailyGenerated) : 3;
    if (plan === "free" && remaining === 0) {
      openModal({ type: "upgrade", auto: true });
      return;
    }
    const n = plan === "free" ? remaining : 3;
    openModal({
      type: "autoProgress",
      onDone: () => {
        generateRoteirosInternal(n);
        setSavedTemas(new Array(n).fill(true));
        const label = sourceLabel() ?? "fonte selecionada";
        applyVideos(
          Array.from({ length: n }, (_, i) => ({ title: `Tema ${String(i + 1).padStart(2, "0")}` })),
          `${n} vídeos gerados hoje · fonte: ${label}`,
        );
        if (plan === "free") {
          setDailyGenerated((d) => Math.min(limit as number, d + n));
        }
        closeModal();
      },
    });
  }, [plan, freeLimit, dailyGenerated, openModal, generateRoteirosInternal, sourceLabel, applyVideos, closeModal]);

  const publishVideo = useCallback(
    (idx: number) => {
      if (!tiktokConnected) {
        openModal({ type: "tiktok" });
        return;
      }
      setVideos((prev) => prev.map((v, i) => (i === idx ? { ...v, publishing: true } : v)));
      setTimeout(() => {
        setVideos((prev) =>
          prev.map((v, i) => (i === idx ? { ...v, publishing: false, published: true } : v)),
        );
      }, 1400);
    },
    [tiktokConnected, openModal],
  );

  const connectEleven = useCallback((name: string) => {
    setVoiceCloned(true);
    setSelectedVoiceName(name);
  }, []);

  const connectTiktok = useCallback((handle: string) => {
    setTiktokConnected(true);
    setTiktokHandle(handle);
  }, []);

  const saveWhatsapp = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const accountInitials = useCallback(() => {
    const parts = accountName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [accountName]);

  const value = useMemo<WizardContextValue>(
    () => ({
      accountName,
      plan,
      freeDay,
      dailyGenerated,
      voiceCloned,
      selectedVoiceName,
      tiktokConnected,
      tiktokHandle,
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
      selectedStyle,
      videos,
      videoCountStatus,
      modal,
      setAccountName,
      accountInitials,
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
      setPlan,
      requestPro,
      confirmUpgrade,
      bumpFreeDay,
      freeLimit,
      editRoteiroText,
      regenerateRoteiro,
      clickGerar,
      setScriptIndex,
      saveCurrentRecording,
      toggleSelectedForVideo,
      setSelectedStyle,
      confirmBuild,
      clickAutoGenerate,
      publishVideo,
      connectEleven,
      connectTiktok,
      saveWhatsapp,
      openModal,
      closeModal,
    }),
    [
      accountName,
      plan,
      freeDay,
      dailyGenerated,
      voiceCloned,
      selectedVoiceName,
      tiktokConnected,
      tiktokHandle,
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
      selectedStyle,
      videos,
      videoCountStatus,
      modal,
      accountInitials,
      addOwnImages,
      removeOwnImage,
      sourceLabel,
      matchedOwnImageIndices,
      setQty,
      qtyMax,
      setPlan,
      requestPro,
      confirmUpgrade,
      bumpFreeDay,
      freeLimit,
      editRoteiroText,
      regenerateRoteiro,
      clickGerar,
      saveCurrentRecording,
      toggleSelectedForVideo,
      confirmBuild,
      clickAutoGenerate,
      publishVideo,
      connectEleven,
      connectTiktok,
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
