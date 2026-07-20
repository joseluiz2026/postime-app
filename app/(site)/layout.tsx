import { AmbientBackground } from "@/components/site/AmbientBackground";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AmbientBackground />
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}
