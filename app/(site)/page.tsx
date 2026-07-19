import { ComoFunciona } from "@/components/site/ComoFunciona";
import { Faq } from "@/components/site/Faq";
import { Features } from "@/components/site/Features";
import { FinalCta } from "@/components/site/FinalCta";
import { Gallery } from "@/components/site/Gallery";
import { Hero } from "@/components/site/Hero";
import { Problem } from "@/components/site/Problem";
import { Solution } from "@/components/site/Solution";
import { Stats } from "@/components/site/Stats";
import { TrialCta } from "@/components/site/TrialCta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <ComoFunciona />
      <Features />
      <Gallery />
      <Stats />
      <TrialCta />
      <Faq />
      <FinalCta />
    </>
  );
}
