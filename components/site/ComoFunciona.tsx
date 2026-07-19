import { Eyebrow, SectionHead, SiteBtn } from "./ui";

const STEPS = [
  { n: 1, title: "Escolha a fonte", desc: "Suba um PDF, cole um texto, jogue um link, ou digite um tema. A IA também pode pesquisar por você." },
  { n: 2, title: "Roteiros em segundos", desc: "O POSTime extrai os temas e escreve os roteiros automaticamente. Edite se quiser, ou deixe como está." },
  { n: 3, title: "Grave, envie ou narre", desc: "Grave sua voz, envie um áudio pronto, ou clone sua voz de verdade no plano Pro." },
  { n: 4, title: "Estilo e publicação", desc: "Escolha entre 6 estilos visuais, confirme e publique direto no TikTok." },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-24 max-[720px]:py-14">
      <div className="max-w-[1120px] mx-auto px-8">
        <SectionHead>
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
            Do zero ao vídeo pronto em 4 passos
          </h2>
        </SectionHead>

        <div className="grid grid-cols-4 gap-6 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-6 transition-colors hover:border-[var(--line-strong)]">
              <div className="font-mono text-[13px] text-[var(--gold)] border border-[var(--line-strong)] w-8 h-8 rounded-full flex items-center justify-center mb-4">
                {s.n}
              </div>
              <h3 className="text-[17px] font-[var(--font-display)] font-extrabold mb-2">{s.title}</h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-4 flex-wrap">
          <SiteBtn href="/cadastro">Quero começar</SiteBtn>
        </div>
      </div>
    </section>
  );
}
