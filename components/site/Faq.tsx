import { TRIAL_DAYS } from "@/lib/plan";
import { Eyebrow, SectionHead } from "./ui";

const ITEMS = [
  {
    q: "Preciso colocar cartão de crédito para testar?",
    a: `Não. O cadastro para os ${TRIAL_DAYS} dias grátis não exige pagamento nenhum — é só nome, e-mail e senha.`,
  },
  {
    q: `O que acontece depois dos ${TRIAL_DAYS} dias?`,
    a: "Você precisa de uma assinatura ativa para continuar gerando — não existe outro plano gratuito. Baixe seus vídeos assim que ficarem prontos: eles não ficam guardados na plataforma por muito tempo.",
  },
  {
    q: "Preciso saber editar vídeo?",
    a: "Não. O POSTime monta tudo sozinho — roteiro, narração, imagens e montagem.",
  },
  {
    q: "Funciona só para TikTok?",
    a: "Não — os vídeos saem em formato vertical, prontos pra TikTok, Instagram Reels, YouTube Shorts e outras redes. Hoje você baixa e publica manualmente; publicação automática direto pela plataforma é um recurso futuro.",
  },
  {
    q: "Posso usar a minha própria voz?",
    a: "Sim — grave direto no app ou envie um áudio pronto. Clonagem de voz com IA está a caminho.",
  },
];

export function Faq() {
  return (
    <section className="py-24 max-[720px]:py-14">
      <div className="max-w-[1120px] mx-auto px-8">
        <SectionHead>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">Perguntas frequentes</h2>
        </SectionHead>

        <div className="flex flex-col">
          {ITEMS.map((item) => (
            <details key={item.q} className="border-b-[0.5px] border-[var(--line)] py-5 group">
              <summary className="cursor-pointer text-base font-medium text-[var(--text-1)] list-none marker:hidden flex justify-between items-center gap-4">
                {item.q}
                <span className="text-[var(--gold)] text-xl shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-[var(--text-2)] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
