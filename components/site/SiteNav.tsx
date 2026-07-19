import Link from "next/link";
import { Icon } from "@/lib/icons";

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 bg-[rgba(11,18,32,0.82)] backdrop-blur-md border-b-[0.5px] border-[var(--line)]">
      <div className="flex items-center justify-between px-8 py-4 max-w-[1120px] mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true">
            <defs>
              <linearGradient id="navGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#38BDF8" />
                <stop offset="1" stopColor="#6366F1" />
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="11" fill="url(#navGrad)" />
            <path d="M15 11.5v17l14-8.5z" fill="#0B1220" />
          </svg>
          <span className="font-[var(--font-display)] font-extrabold text-[19px] tracking-tight">
            POST<span className="text-[var(--gold)]">i</span>
            <span className="bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] bg-clip-text text-transparent">me</span>
          </span>
        </Link>
        <div className="flex items-center gap-3.5">
          <span className="font-mono text-xs text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] border-[0.5px] border-[var(--line-strong)] px-3 py-1.5 rounded-full whitespace-nowrap max-[520px]:hidden">
            Sem cartão de crédito!
          </span>
          <Link
            href="/cadastro"
            className="font-sans font-semibold text-[15px] px-[22px] py-[11px] rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220] shadow-[0_8px_24px_rgba(56,189,248,0.25)] inline-flex items-center gap-2 transition-transform hover:-translate-y-px"
          >
            Use agora! <Icon name="arrow-right" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
