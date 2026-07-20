import Image from "next/image";
import { Eyebrow, SectionHead } from "./ui";

const PHOTOS = [
  { src: "/images/gallery-1.jpg", alt: "Criador sorrindo enquanto grava um vídeo com o celular no quarto" },
  { src: "/images/gallery-2.jpg", alt: "Mesa de trabalho com celular em tripé gravando, caderno de roteiro e café" },
  { src: "/images/gallery-3.jpg", alt: "Cachorro de estimação, parte do dia a dia de quem cria conteúdo" },
  { src: "/images/gallery-4.jpg", alt: "Mão segurando o celular mostrando o painel de métricas de um vídeo" },
];

export function Gallery() {
  return (
    <section className="py-24 max-[720px]:py-14">
      <div className="max-w-[1120px] mx-auto px-8">
        <SectionHead>
          <Eyebrow>O dia a dia de quem cria</Eyebrow>
          <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
            Feito pra pessoas de verdade, não só pra tela
          </h2>
          <p className="mt-3 text-base text-[var(--text-2)] leading-relaxed">
            Espaço reservado pras suas próprias fotos — de você criando, dos bastidores, do seu bichinho, da sua
            rotina. Substitua pelas imagens reais antes de publicar.
          </p>
        </SectionHead>

        <div className="grid grid-cols-2 gap-4">
          {PHOTOS.map((p, i) => (
            <div
              key={p.src}
              className="relative rounded-2xl overflow-hidden border-[0.5px] border-[var(--line)] aspect-square"
            >
              <Image src={p.src} alt={p.alt} fill className="object-cover" sizes="(max-width: 720px) 50vw, 25vw" priority={i === 0} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
