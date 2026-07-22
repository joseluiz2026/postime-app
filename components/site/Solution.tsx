import Image from "next/image";
import { Eyebrow, SiteBtn } from "./ui";

export function Solution() {
  return (
    <section className="pt-8 max-[720px]:pt-4">
      <div className="max-w-[1120px] mx-auto px-8">
        <div className="grid grid-cols-2 gap-[72px] items-stretch max-[900px]:grid-cols-1 max-[900px]:gap-8">
          <div className="flex flex-col justify-between max-w-[620px]">
            <div>
              <Eyebrow>A solução</Eyebrow>
              <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
                O POST<span className="text-[var(--gold)]">i</span>
                <span className="bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] bg-clip-text text-transparent">
                  me
                </span>
                <br />
                faz o trabalho pesado.
                <br />
                Você só aparece... ou não.
                <br />
                Você decide.
              </h2>
              <p className="mt-3 text-base text-[var(--text-2)] leading-relaxed">
                Dá o material — um PDF, um tema, um link, ou só uma ideia — e o POSTime cuida do resto: extrai os
                assuntos, escreve os roteiros, narra com a sua voz, busca as imagens certas e monta o vídeo, pronto
                pra baixar e postar no TikTok, Instagram ou onde quiser.
              </p>
            </div>
            <SiteBtn href="/cadastro" className="self-start mt-8">
              Experimentar Agora
            </SiteBtn>
          </div>
          <div className="self-end relative rounded-[22px] overflow-hidden aspect-[4/5] bg-gradient-to-br from-[var(--bg-1)] to-[var(--bg-2)] border border-[var(--line)] shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            <Image
              src="/images/solution.jpg"
              alt="Pessoa gravando conteúdo com o celular"
              fill
              className="object-cover scale-[1.3] origin-[20%_15%]"
            />
          </div>
        </div>
      </div>
      <div className="max-w-[1120px] mx-auto px-8">
        <div className="h-px bg-[var(--line)] mt-16" />
      </div>
    </section>
  );
}
