import { Eyebrow, SectionHead, SiteBtn } from "./ui";

const STATS = [
  { num: "4 passos", label: "simples, sem edição manual" },
  { num: "9 dias", label: "grátis, sem risco" },
  { num: "3 min", label: "do tema ao vídeo pronto" },
];

export function Stats() {
  return (
    <section className="py-24 max-[720px]:py-14">
      <div className="max-w-[1120px] mx-auto px-8">
        <SectionHead>
          <Eyebrow>Construído pra quem vive de conteúdo</Eyebrow>
          <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
            Números que mostram a velocidade
          </h2>
        </SectionHead>

        <div className="grid grid-cols-3 gap-6 max-[640px]:grid-cols-1">
          {STATS.map((s) => (
            <div key={s.label} className="text-center bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl py-8">
              <div className="font-[var(--font-display)] font-extrabold text-[34px] bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] bg-clip-text text-transparent">
                {s.num}
              </div>
              <div className="text-sm text-[var(--text-3)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-gradient-to-br from-[var(--bg-1)] to-[var(--bg-2)] border border-[var(--line-strong)] rounded-2xl px-8 py-7 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
          <p className="text-[var(--text-1)] italic">
            &quot;[Espaço reservado para o primeiro depoimento real de um usuário]&quot;
            <br />
            — Nome, @usuario
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <SiteBtn href="/cadastro">Seja um dos primeiros</SiteBtn>
        </div>
      </div>
    </section>
  );
}
