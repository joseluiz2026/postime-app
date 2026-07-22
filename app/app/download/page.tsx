"use client";

import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { useDistribution } from "@/lib/distribution-context";
import { Btn, Card, HelpTip } from "@/components/app/ui";

function formatDuration(seconds?: number): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DownloadPage() {
  const wizard = useWizard();
  const distribution = useDistribution();

  return (
    <>
      <Card>
        <h3 className="font-sans text-base font-semibold m-0 mb-1 text-[var(--text-1)]">Vídeos prontos de hoje</h3>
        <p className="text-[13px] text-[var(--text-2)] m-0 mb-6 leading-relaxed">
          Baixe seus vídeos. Formato vertical, otimizado para TikTok.
        </p>

        {wizard.videos.length === 0 ? (
          <p className="text-[13px] text-[var(--text-2)]">
            Nenhum vídeo gerado ainda. Volte à aba Estilo e confirme a montagem.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4 max-[640px]:grid-cols-2 max-[420px]:grid-cols-1">
            {wizard.videos.map((video) => (
              <div key={video.id} className="border-[0.5px] border-[var(--line)] rounded-xl overflow-hidden transition-all hover:border-[var(--line-strong)] hover:-translate-y-0.5">
                <div
                  className="aspect-[9/16] bg-[var(--bg-2)] bg-cover bg-center flex items-center justify-center text-[var(--text-3)] text-[22px] relative"
                  style={video.imageUrl ? { backgroundImage: `url(${video.imageUrl})` } : undefined}
                >
                  {!video.imageUrl && <Icon name="player-play" />}
                  <span className="absolute bottom-2 right-2 font-mono text-[10px] bg-black/55 px-1.5 py-1 rounded-md text-[var(--text-1)]">
                    {formatDuration(video.durationSeconds)}
                  </span>
                </div>
                <div className="p-3">
                  <div className="text-[12.5px] font-medium text-[var(--text-1)] mb-3">{video.title}</div>
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href={video.videoUrl ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!video.videoUrl}
                      className={`flex-1 min-w-0 px-1.5 py-1.5 text-xs text-center rounded-[9px] border-[0.5px] bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] border-[color-mix(in_srgb,var(--gold)_30%,transparent)] text-[var(--gold)] transition-all hover:bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] ${
                        video.videoUrl ? "cursor-pointer" : "opacity-40 pointer-events-none"
                      }`}
                    >
                      Ver
                    </a>
                    <a
                      href={video.videoUrl ?? undefined}
                      download={video.videoUrl ? `${video.title}.mp4` : undefined}
                      aria-disabled={!video.videoUrl}
                      className={`flex-1 min-w-0 px-1.5 py-1.5 text-xs text-center rounded-[9px] border-[0.5px] bg-[color-mix(in_srgb,var(--gold)_32%,transparent)] border-[color-mix(in_srgb,var(--gold)_55%,transparent)] text-[var(--gold)] transition-all hover:bg-[color-mix(in_srgb,var(--gold)_42%,transparent)] ${
                        video.videoUrl ? "cursor-pointer" : "opacity-40 pointer-events-none"
                      }`}
                    >
                      Baixar
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-8 pt-4 border-t-[0.5px] border-[var(--line)] flex-wrap gap-3">
          <span className="font-mono text-xs text-[var(--text-3)]">{wizard.videoCountStatus}</span>
          <Btn variant="primary">
            <Icon name="download" /> Baixar todos
          </Btn>
        </div>

        <div className="flex items-center mt-3 font-mono text-[11px] text-[var(--text-3)]">
          <Icon name="photo" className="mr-1.5" /> Imagens do Pexels
          <HelpTip
            label="Como funcionam as imagens automáticas"
            text="A imagem de cada vídeo vem automaticamente do Pexels, escolhida com base no texto do roteiro. Nenhuma é paga e nenhuma exige atribuição manual da sua parte."
          />
        </div>
      </Card>

      {wizard.videos.length > 0 && (
        <Card>
          <div className="flex items-center gap-2.5 mb-1">
            <Icon name="brand-tiktok" className="text-lg text-[var(--gold)]" />
            <h4 className="font-sans text-[15px] font-semibold m-0 text-[var(--text-1)]">
              Distribuição <span className="font-mono text-[10.5px] text-[var(--text-3)] font-normal">· Postime Connect</span>
            </h4>
            <span className="font-mono text-[10.5px] text-[var(--text-3)] border-[0.5px] border-[var(--line-strong)] rounded-full px-2 py-0.5">
              Em breve
            </span>
          </div>
          <p className="text-[12.5px] text-[var(--text-2)] bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[10px] px-3.5 py-3 mb-4 leading-relaxed">
            <Icon name="help" /> Publicar direto pras redes é um módulo futuro e separado do Core (Postime Connect) —
            hoje é só uma prévia, sem chamada real ao TikTok. Baixe e publique manualmente enquanto isso.
          </p>
          <div className="flex items-center gap-2.5 mb-4">
            <Btn onClick={() => wizard.openModal({ type: "tiktok" })}>
              <Icon name="brand-tiktok" />{" "}
              {distribution.tiktokConnected ? "Trocar conta" : "Conectar conta TikTok (prévia)"}
            </Btn>
            {distribution.tiktokConnected && (
              <span className="text-[13px] text-[var(--text-2)]">
                <Icon name="circle-check" className="text-[var(--teal)]" /> {distribution.tiktokHandle} conectado
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {wizard.videos.map((video) => {
              const status = distribution.publishStatus[video.id];
              return (
                <div
                  key={video.id}
                  className="flex items-center justify-between gap-3 bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[9px] px-3 py-2"
                >
                  <span className="text-xs text-[var(--text-2)] truncate">{video.title}</span>
                  <button
                    onClick={() => distribution.publishVideo(video.id)}
                    disabled={status?.publishing}
                    className={`shrink-0 px-2.5 py-1 text-xs rounded-full border-[0.5px] cursor-pointer transition-all font-medium ${
                      status?.published
                        ? "bg-[color-mix(in_srgb,var(--teal)_18%,transparent)] border-[color-mix(in_srgb,var(--teal)_35%,transparent)] text-[var(--teal)]"
                        : "border-[var(--line-strong)] text-[var(--text-2)] hover:border-[var(--gold)] hover:text-[var(--gold)]"
                    }`}
                  >
                    {status?.publishing ? "Abrindo TikTok..." : status?.published ? "Publicado (prévia)" : "Publicar"}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
