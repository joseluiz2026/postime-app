import { SiteBtn } from "./ui";

export function FinalCta() {
  return (
    <section id="cta" className="py-24 max-[720px]:py-14 text-center">
      <div className="max-w-[720px] mx-auto px-8">
        <h2 className="font-[var(--font-display)] font-extrabold text-[36px] leading-tight m-0">
          Seu próximo vídeo pode estar pronto em 3 minutos.
        </h2>
        <p className="mt-3.5 text-base text-[var(--text-2)] leading-relaxed">
          9 dias grátis. Sem cartão. Sem desculpa pra não postar hoje.
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
