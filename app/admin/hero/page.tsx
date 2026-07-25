"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";

type HeroVideo = { id: string; label: string; url: string; position: number };

function VideoRow({ video, index, total, onChanged }: { video: HeroVideo; index: number; total: number; onChanged: () => void }) {
  const [label, setLabel] = useState(video.label);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function renameIfChanged() {
    if (label.trim() === video.label || !label.trim()) return;
    await fetch(`/api/admin/hero-videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() }),
    });
    onChanged();
  }

  async function move(direction: "up" | "down") {
    setBusy(true);
    await fetch(`/api/admin/hero-videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    setBusy(false);
    onChanged();
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/admin/hero-videos/${video.id}`, { method: "DELETE" });
    setBusy(false);
    onChanged();
  }

  return (
    <div className="flex items-center gap-3 bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-xl p-3">
      <video src={video.url} className="w-24 h-16 rounded-lg object-cover bg-[var(--bg-2)]" muted playsInline />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={renameIfChanged}
        className="flex-1 bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
      />
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" disabled={busy || index === 0} onClick={() => move("up")} className="p-1.5 text-[var(--text-2)] hover:text-[var(--gold)] disabled:opacity-30">
          <Icon name="chevron-left" className="rotate-90" />
        </button>
        <button type="button" disabled={busy || index === total - 1} onClick={() => move("down")} className="p-1.5 text-[var(--text-2)] hover:text-[var(--gold)] disabled:opacity-30">
          <Icon name="chevron-right" className="rotate-90" />
        </button>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="p-1.5 text-red-400 hover:text-red-300">
            <Icon name="trash" />
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={remove} className="text-xs text-red-400 font-semibold px-2">
            Confirmar?
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminHeroPage() {
  const [videos, setVideos] = useState<HeroVideo[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/admin/hero-videos");
    const data = await res.json();
    setVideos(data.videos ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("label", file.name.replace(/\.[^.]+$/, "").slice(0, 30));

    const res = await fetch("/api/admin/hero-videos", { method: "POST", body: form });
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error === "max_videos_reached" ? "Limite de 7 vídeos atingido." : "Falha ao enviar o vídeo.");
      return;
    }
    load();
  }

  const atLimit = (videos?.length ?? 0) >= 7;

  return (
    <div>
      <h1 className="font-[var(--font-display)] font-extrabold text-2xl mb-2">Vídeo do Hero</h1>
      <p className="text-sm text-[var(--text-3)] mb-6">
        Até 7 vídeos exibidos em abas no topo do site. Sem nenhum vídeo, mostra a imagem estática de hoje.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {videos?.map((v, i) => (
          <VideoRow key={v.id} video={v} index={i} total={videos.length} onChanged={load} />
        ))}
        {videos?.length === 0 && <p className="text-sm text-[var(--text-3)]">Nenhum vídeo configurado ainda.</p>}
      </div>

      <label
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
          atLimit || uploading
            ? "bg-[var(--bg-2)] text-[var(--text-3)] cursor-not-allowed"
            : "bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220]"
        }`}
      >
        <Icon name="cloud-upload" />
        {uploading ? "Enviando..." : atLimit ? "Limite atingido (7/7)" : "Enviar vídeo"}
        <input ref={fileInput} type="file" accept="video/*" onChange={handleUpload} disabled={atLimit || uploading} className="hidden" />
      </label>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
