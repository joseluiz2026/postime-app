"use client";

import { Icon } from "@/lib/icons";
import { useWizard } from "@/lib/wizard-context";
import { Btn, Card, HelpTip } from "@/components/app/ui";

export default function DownloadPage() {
  const wizard = useWizard();

  return (
    <Card>
      <h3 className="font-sans text-base font-semibold m-0 mb-1 text-[var(--text-1)]">Vídeos prontos de hoje</h3>
      <p className="text-[13px] text-[var(--text-2)] m-0 mb-6 leading-relaxed">
        Baixe e publique. Formato vertical, otimizado para TikTok.
      </p>

      {wizard.videos.length === 0 ? (
        <p className="text-[13px] text-[var(--text-2)]">
          Nenhum vídeo gerado ainda. Volte à aba Estilo e confirme a montagem.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-4 max-[640px]:grid-cols-2 max-[420px]:grid-cols-1">
          {wizard.videos.map((video, idx) => (
            <div key={idx} className="border-[0.5px] border-[var(--line)] rounded-xl overflow-hidden transition-all hover:border-[var(--line-strong)] hover:-translate-y-0.5">
              <div className="aspect-[9/16] bg-[var(--bg-2)] flex items-center justify-center text-[var(--text-3)] text-[22px] relative">
                <Icon name="player-play" />
                <span className="absolute bottom-2 right-2 font-mono text-[10px] bg-black/55 px-1.5 py-1 rounded-md text-[var(--text-1)]">
                  0:30
                </span>
              </div>
              <div className="p-3">
                <div className="text-[12.5px] font-medium text-[var(--text-1)] mb-3">{video.title}</div>
                <div className="flex flex-wrap gap-1.5">
                  <button className="flex-1 min-w-0 px-1.5 py-1.5 text-xs text-center rounded-[9px] border-[0.5px] bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] border-[color-mix(in_srgb,var(--gold)_30%,transparent)] text-[var(--gold)] cursor-pointer transition-all hover:bg-[color-mix(in_srgb,var(--gold)_22%,transparent)]">
                    Ver
                  </button>
                  <button className="flex-1 min-w-0 px-1.5 py-1.5 text-xs text-center rounded-[9px] border-[0.5px] bg-[color-mix(in_srgb,var(--gold)_32%,transparent)] border-[color-mix(in_srgb,var(--gold)_55%,transparent)] text-[var(--gold)] cursor-pointer transition-all hover:bg-[color-mix(in_srgb,var(--gold)_42%,transparent)]">
                    Baixar
                  </button>
                  <button
                    onClick={() => wizard.publishVideo(idx)}
                    disabled={video.publishing}
                    className={`basis-full px-1.5 py-1.5 text-xs text-center rounded-[9px] border-[0.5px] cursor-pointer transition-all font-semibold ${
                      video.published
                        ? "bg-[color-mix(in_srgb,var(--teal)_55%,transparent)] border-[var(--teal)] text-[#12141A]"
                        : "bg-[color-mix(in_srgb,var(--gold)_55%,transparent)] border-[var(--gold)] text-[#12141A] hover:bg-[color-mix(in_srgb,var(--gold)_68%,transparent)]"
                    }`}
                  >
                    {video.publishing ? "Abrindo TikTok..." : video.published ? "Publicado" : "Publicar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-8 pt-4 border-t-[0.5px] border-[var(--line)] flex-wrap gap-3">
        <span className="font-mono text-xs text-[var(--text-3)]">{wizard.videoCountStatus}</span>
        <div className="flex gap-2 items-center">
          <Btn onClick={() => wizard.openModal({ type: "tiktok" })}>
            <Icon name="brand-tiktok" />{" "}
            {wizard.tiktokConnected ? "Trocar conta" : "Conectar conta TikTok"}
          </Btn>
          {wizard.tiktokConnected && (
            <span className="text-[13px] text-[var(--text-2)]">
              <Icon name="circle-check" className="text-[var(--teal)]" /> {wizard.tiktokHandle} conectado
            </span>
          )}
          <Btn variant="primary">
            <Icon name="download" /> Baixar todos
          </Btn>
        </div>
      </div>

      <div className="flex items-center mt-3 font-mono text-[11px] text-[var(--text-3)]">
        <Icon name="photo" className="mr-1.5" /> Imagens de Unsplash · Pexels · Pixabay
        <HelpTip
          label="Como funcionam as imagens automáticas"
          text="As imagens de cada vídeo vêm automaticamente desses três bancos gratuitos, escolhidas com base no tema do roteiro. Nenhuma é paga e nenhuma exige atribuição manual da sua parte."
        />
      </div>
    </Card>
  );
}
