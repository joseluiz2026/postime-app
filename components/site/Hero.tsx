import Image from "next/image";
import { Icon } from "@/lib/icons";
import { TRIAL_DAYS } from "@/lib/plan";
import { createAdminClient } from "@/lib/supabase/admin";
import { Eyebrow, SiteBtn } from "./ui";
import { HeroVideoTabs } from "./HeroVideoTabs";

const BUCKET = "postime-hero-videos";

async function getHeroVideos() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("hero_videos").select("id, label, storage_path").order("position");
  return (data ?? []).map((v) => ({
    id: v.id,
    label: v.label,
    url: supabase.storage.from(BUCKET).getPublicUrl(v.storage_path).data.publicUrl,
  }));
}

export async function Hero() {
  const videos = await getHeroVideos();

  return (
    <header className="relative overflow-hidden min-h-[560px] flex items-center py-24">
      <div className="absolute inset-0 z-0 pointer-events-none">
        {videos.length > 0 ? (
          <HeroVideoTabs videos={videos} />
        ) : (
          <Image
            src="/images/hero.jpg"
            alt="Pessoa gravando um vídeo para TikTok com o celular"
            fill
            priority
            className="object-cover object-[center_25%] max-[640px]:object-[83%_25%]"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,18,32,0.97)_0%,rgba(11,18,32,0.88)_32%,rgba(11,18,32,0.45)_58%,rgba(11,18,32,0.25)_100%)]" />
      </div>
      <div className="relative z-[1] w-full max-w-[1120px] mx-auto px-8">
        <div className="max-w-[600px]">
          <Eyebrow>Motor de conteúdo com IA</Eyebrow>
          <h1 className="font-[var(--font-display)] font-extrabold text-[56px] leading-[1.04] tracking-tight m-0 max-[640px]:text-[36px]">
            Crie vídeos virais em escala.
            <br />
            <span className="bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] bg-clip-text text-transparent">
              Com poucos cliques.
            </span>
          </h1>
          <p className="mt-6 text-lg max-w-[480px] text-[var(--text-2)] leading-relaxed">
            Transforme qualquer PDF, tema ou vídeo em roteiros e vídeos verticais prontos pra TikTok, Instagram e
            YouTube, em minutos.
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
