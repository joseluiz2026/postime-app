import { Icon } from "@/lib/icons";
import { TRIAL_DAYS } from "@/lib/plan";
import { Eyebrow, SectionHead, SiteBtn } from "./ui";

const FEATURES = [
  { icon: "microphone", title: "Sua voz, sempre", desc: "Grave na hora, envie um MP3, ou clone sua voz com IA (em breve)." },
  { icon: "photo", title: "Imagens automáticas", desc: "Busca sozinho em bancos gratuitos — ou use suas próprias fotos." },
  { icon: "layout-grid", title: "6 estilos visuais", desc: "De minimalista a neon bold, escolha a cara do seu vídeo." },
  { icon: "brand-tiktok", title: "Pronto pra qualquer rede", desc: "Formato vertical, otimizado pra TikTok, Reels e Shorts." },
  { icon: "bolt", title: "Modo automático", desc: "Um clique e o vídeo sai pronto, sem passar por nenhuma etapa manual." },
  { icon: "lock", title: "Seus dados, sua conta", desc: "Conecte suas próprias chaves de API com segurança, quando quiser." },
];

export function Features() {
  return (
    <section className="py-24 max-[720px]:py-14 relative overflow-hidden">
      <div className="max-w-[1120px] mx-auto px-8 relative z-[1]">
        <SectionHead>
          <Eyebrow>Diferenciais</Eyebrow>
          <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
            Feito pra quem quer viralizar sem virar refém do conteúdo
          </h2>
        </SectionHead>

        <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-6">
              <div className="w-9 h-9 rounded-lg bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] flex items-center justify-center text-[var(--gold)] mb-4">
                <Icon name={f.icon} />
              </div>
              <h3 className="text-[17px] font-[var(--font-display)] font-extrabold mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-4 flex-wrap">
          <SiteBtn href="/cadastro">Testar todos os recursos</SiteBtn>
          <p className="text-sm text-[var(--text-3)]">Grátis pelos primeiros {TRIAL_DAYS} dias.</p>
        </div>
      </div>
    </section>
  );
}
