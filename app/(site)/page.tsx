import { AudienceFit } from "@/components/site/AudienceFit";
import { ComoFunciona } from "@/components/site/ComoFunciona";
import { Faq } from "@/components/site/Faq";
import { Features } from "@/components/site/Features";
import { FinalCta } from "@/components/site/FinalCta";
import { Gallery } from "@/components/site/Gallery";
import { Hero } from "@/components/site/Hero";
import { Problem } from "@/components/site/Problem";
import { Solution } from "@/components/site/Solution";
import { TrialCta } from "@/components/site/TrialCta";

// Hero fetches admin-configured videos from the DB (see components/site/Hero.tsx) —
// without this the route gets fully prerendered at build time and a Hero video
// change in /admin/hero wouldn't show up until the next deploy.
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <ComoFunciona />
      <Features />
      <Gallery />
      <AudienceFit />
      <TrialCta />
      <Faq />
      <FinalCta />
    </>
  );
}
