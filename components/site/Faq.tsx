import { Eyebrow, SectionHead } from "./ui";

const ITEMS = [
  {
    q: "Preciso colocar cartão de crédito para testar?",
    a: "Não. O cadastro para os 9 dias grátis não exige pagamento nenhum — é só nome, e-mail e senha.",
  },
  {
    q: "O que acontece depois dos 9 dias?",
    a: "Você pode assinar o plano Pro para continuar gerando sem limite. Se não assinar, sua conta fica pausada — seus vídeos continuam salvos.",
  },
  {
    q: "Preciso saber editar vídeo?",
    a: "Não. O POSTime monta tudo sozinho — roteiro, narração, imagens e montagem.",
  },
  {
    q: "Funciona só para TikTok?",
    a: "O foco é TikTok, com publicação direta na plataforma. Os vídeos gerados também podem ser baixados e usados em outras redes.",
  },
  {
    q: "Posso usar a minha própria voz?",
    a: "Sim — grave direto no app, envie um áudio pronto, ou clone sua voz com IA no plano Pro.",
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
