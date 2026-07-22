import Image from "next/image";
import { Icon } from "@/lib/icons";
import { TRIAL_DAYS } from "@/lib/plan";
import { Eyebrow, SectionHead, SiteBtn } from "./ui";

const CARDS = [
  {
    icon: "clock",
    img: "/images/pain-tempo.jpg",
    alt: "Pessoa mexendo no celular no meio da correria do dia a dia",
    quote: '"Não tenho tempo pra gravar 3 vídeos por dia."',
  },
  {
    icon: "help",
    img: "/images/pain-ideia.jpg",
    alt: "Pessoa pensativa olhando o celular, sem ideia do que postar",
    quote: '"Fico sem ideia de tema depois da primeira semana."',
  },
  {
    icon: "trending-up",
    img: "/images/pain-alcance.jpg",
    alt: "Celular mostrando um painel de métricas de alcance",
    quote: '"Quando falho um dia, o alcance despenca."',
  },
];

export function Problem() {
  return (
    <section className="py-24 max-[720px]:py-14">
      <div className="max-w-[1120px] mx-auto px-8">
        <SectionHead>
          <Eyebrow>O problema</Eyebrow>
          <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
            Criar conteúdo todo dia é insustentável
          </h2>
          <p className="mt-3 text-base text-[var(--text-2)] leading-relaxed">
            Você sabe que postar todo dia é o que faz um perfil crescer. Mas entre pensar no tema, escrever o
            roteiro, gravar, editar e legendar — sobra pouca energia pra fazer isso de verdade, todo santo dia.
          </p>
        </SectionHead>

        <div className="grid grid-cols-3 gap-6 max-[720px]:grid-cols-1">
          {CARDS.map((c) => (
            <div key={c.quote} className="relative overflow-hidden bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-7">
              <div
                className="absolute inset-y-0 right-0 w-[70%] bg-cover bg-center opacity-50 z-0 pointer-events-none"
                style={{
                  maskImage: "linear-gradient(to left, black 0%, black 30%, transparent 85%)",
                  WebkitMaskImage: "linear-gradient(to left, black 0%, black 30%, transparent 85%)",
                }}
              >
                <Image src={c.img} alt={c.alt} fill className="object-cover" />
                <div className="absolute inset-0 bg-[var(--bg-2)] opacity-35" />
              </div>
              <Icon name={c.icon} className="relative z-[1] text-[26px] text-[var(--gold)] mb-4 block" />
              <p className="relative z-[1] text-[var(--text-1)] text-base font-medium leading-snug">{c.quote}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-4 flex-wrap">
          <SiteBtn href="/cadastro">Resolver isso agora</SiteBtn>
          <p className="text-sm text-[var(--text-3)]">{TRIAL_DAYS} dias grátis, sem cartão.</p>
        </div>
      </div>
    </section>
  );
}
