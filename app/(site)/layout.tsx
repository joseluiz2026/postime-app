import Image from "next/image";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 -z-10 opacity-25 pointer-events-none">
        <Image src="/images/bg-ambient.jpg" alt="" fill priority className="object-cover" />
      </div>
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}
