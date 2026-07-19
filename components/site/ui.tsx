import Link from "next/link";
import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--gold)] mb-4 flex items-center gap-2">
      <span className="w-4 h-[1.5px] bg-[var(--gold)] inline-block" />
      {children}
    </p>
  );
}

type SiteBtnVariant = "primary" | "ghost";

export function SiteBtn({
  href,
  variant = "primary",
  large,
  className = "",
  children,
}: {
  href: string;
  variant?: SiteBtnVariant;
  large?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const base = `font-sans font-semibold rounded-xl inline-flex items-center gap-2 transition-all ${
    large ? "text-base px-[34px] py-[18px]" : "text-[15px] px-7 py-[15px]"
  }`;
  const variants: Record<SiteBtnVariant, string> = {
    primary:
      "bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220] shadow-[0_8px_24px_rgba(56,189,248,0.25)] hover:-translate-y-px hover:shadow-[0_12px_30px_rgba(56,189,248,0.35)]",
    ghost: "border-[1.5px] border-[var(--line-strong)] text-[var(--text-1)] hover:border-[var(--gold)] hover:text-[var(--gold)]",
  };
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function SectionHead({ children }: { children: ReactNode }) {
  return <div className="max-w-[620px] mb-14">{children}</div>;
}
