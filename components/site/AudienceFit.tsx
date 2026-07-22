import { Icon } from "@/lib/icons";
import { TRIAL_DAYS } from "@/lib/plan";
import { Eyebrow, SectionHead, SiteBtn } from "./ui";

const PROFILES = [
  {
    icon: "rocket",
    title: "Começando do zero",
    desc: "Sem seguidores, sem experiência — só a vontade de postar. O POSTime cuida do resto pra você sair do papel hoje.",
  },
  {
    icon: "repeat",
    title: "Já tentou e não manteve o ritmo",
    desc: "Consistência é o que mais pesa pro algoritmo, seja TikTok, Reels ou Shorts. Gere o próximo vídeo em minutos sempre que precisar postar.",
  },
  {
    icon: "microphone",
    title: "Não sabe se quer aparecer",
    desc: "Narre com a sua própria voz, clone ela com IA, ou deixe só a narração — você decide o quanto aparece.",
  },
];

export function AudienceFit() {
  return (
    <section className="py-24 max-[720px]:py-14">
      <div className="max-w-[1120px] mx-auto px-8">
        <SectionHead>
          <Eyebrow>Pra quem é o POSTime</Eyebrow>
          <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
            Ideal pra quem está começando a criar conteúdo e quer viralizar
          </h2>
          <p className="mt-3 text-base text-[var(--text-2)] leading-relaxed">
            Não importa se você nunca gravou um vídeo ou já tentou antes e desistiu — o POSTime foi pensado pra
            quem quer testar sem travar.
          </p>
        </SectionHead>

        <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-1">
          {PROFILES.map((p) => (
            <div key={p.title} className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-7">
              <div className="w-9 h-9 rounded-lg bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] flex items-center justify-center text-[var(--gold)] mb-4">
                <Icon name={p.icon} />
              </div>
              <h3 className="text-[17px] font-[var(--font-display)] font-extrabold mb-2">{p.title}</h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-4 flex-wrap">
          <SiteBtn href="/cadastro">Comece a postar hoje</SiteBtn>
          <p className="text-sm text-[var(--text-3)]">{TRIAL_DAYS} dias grátis, sem cartão.</p>
        </div>
      </div>
    </section>
  );
}
