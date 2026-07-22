import Image from "next/image";
import { TRIAL_DAYS } from "@/lib/plan";
import { SiteBtn } from "./ui";

export function FinalCta() {
  return (
    <section id="cta" className="relative overflow-hidden py-32 max-[720px]:py-20 text-center">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/images/final-cta.jpg"
          alt="Criador sorrindo ao ver a notificação de vídeo publicado no celular"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,18,32,0.92)_0%,rgba(11,18,32,0.8)_45%,rgba(11,18,32,0.95)_100%)]" />
      </div>
      <div className="relative z-[1] max-w-[720px] mx-auto px-8">
        <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
          Seu próximo vídeo pode estar pronto em 3 minutos.
        </h2>
        <p className="mt-3.5 text-base text-[var(--text-2)] leading-relaxed">
          {TRIAL_DAYS} dias grátis. Sem cartão. Sem desculpa pra não postar hoje.
        </p>
        <div className="mt-8 flex justify-center">
          <SiteBtn href="/cadastro" large>
            Criar minha conta grátis
          </SiteBtn>
        </div>
        <p className="font-mono text-xs text-[var(--text-3)] mt-4">
          Cadastro rápido · Cancele quando quiser · Seus dados protegidos
        </p>
      </div>
    </section>
  );
}
