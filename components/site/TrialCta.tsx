import Image from "next/image";
import { Eyebrow, SiteBtn } from "./ui";

export function TrialCta() {
  return (
    <section className="py-24 max-[720px]:py-14">
      <div className="max-w-[1120px] mx-auto px-8">
        <div className="relative overflow-hidden rounded-[22px] border-[0.5px] border-[var(--line-strong)]">
          <Image src="/images/trial-card.jpg" alt="Criador sorrindo enquanto grava um vídeo com o celular" fill className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(11,18,32,0.95)_0%,rgba(11,18,32,0.8)_55%,rgba(11,18,32,0.45)_100%)]" />
          <div className="relative z-[1] px-10 py-16 max-w-[560px] max-[640px]:px-6 max-[640px]:py-10">
            <Eyebrow>A oferta</Eyebrow>
            <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
              Comece agora.
              <br />
              9 dias por nossa conta.
            </h2>
            <p className="mt-3.5 text-base text-[var(--text-2)] leading-relaxed">
              Cadastro simples, sem burocracia. Você já começa gerando vídeos no mesmo dia.
            </p>
            <div className="mt-5 font-mono text-[13px] text-[var(--text-1)] bg-[color-mix(in_srgb,var(--bg-0)_60%,transparent)] border-[0.5px] border-[var(--line-strong)] rounded-xl px-5 py-4">
              Depois disso, continue no <b className="text-[var(--text-1)]">plano Pro</b>: vídeos ilimitados, voz
              clonada com IA e publicação automática no TikTok.
            </div>
            <SiteBtn href="/cadastro" large className="mt-8">
              Quero meus 9 dias grátis
            </SiteBtn>
          </div>
        </div>
      </div>
    </section>
  );
}
