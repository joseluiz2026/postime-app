import Image from "next/image";
import { Icon } from "@/lib/icons";
import { TRIAL_DAYS } from "@/lib/plan";
import { Eyebrow, SiteBtn } from "./ui";

export function Hero() {
  return (
    <header className="relative overflow-hidden min-h-[560px] flex items-center py-24">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/images/hero.jpg"
          alt="Pessoa gravando um vídeo para TikTok com o celular"
          fill
          priority
          className="object-cover object-[center_25%] max-[640px]:object-[83%_25%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,18,32,0.97)_0%,rgba(11,18,32,0.88)_32%,rgba(11,18,32,0.45)_58%,rgba(11,18,32,0.25)_100%)]" />
      </div>
      <div className="relative z-[1] w-full max-w-[1120px] mx-auto px-8">
        <div className="max-w-[600px]">
          <Eyebrow>Motor de conteúdo com IA</Eyebrow>
          <h1 className="font-[var(--font-display)] font-extrabold text-[56px] leading-[1.04] tracking-tight m-0 max-[640px]:text-[36px]">
            Poste todo dia.
            <br />
            <span className="bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] bg-clip-text text-transparent">
              Sem gravar todo dia.
            </span>
          </h1>
          <p className="mt-6 text-lg max-w-[480px] text-[var(--text-2)] leading-relaxed">
            Transforme qualquer PDF, tema ou vídeo em roteiros, narração e vídeos verticais prontos pra TikTok,
            Instagram e YouTube — em minutos, com a sua própria voz.
          </p>
          <div className="mt-8 flex items-center gap-4 flex-wrap">
            <SiteBtn href="/cadastro" large>
              Testar grátis por {TRIAL_DAYS} dias <Icon name="arrow-right" />
            </SiteBtn>
            <SiteBtn href="#como-funciona" variant="ghost" large>
              Ver como funciona
            </SiteBtn>
          </div>
          <p className="font-mono text-xs text-[var(--text-3)] mt-4">
            Sem cartão de crédito para começar · Cadastro em 1 minuto
          </p>
        </div>
      </div>
    </header>
  );
}
