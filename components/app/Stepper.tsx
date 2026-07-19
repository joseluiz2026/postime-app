"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/lib/icons";

const STEPS = [
  { n: 1, label: "Fonte", href: "/app/fonte" },
  { n: 2, label: "Roteiros", href: "/app/roteiros" },
  { n: 3, label: "Gravação", href: "/app/gravacao" },
  { n: 4, label: "Estilo", href: "/app/estilo" },
  { n: 5, label: "Download", href: "/app/download" },
];

export function Stepper() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => pathname?.startsWith(s.href));

  return (
    <div className="flex relative mb-8">
      <div className="absolute left-0 right-0 bottom-0 h-px bg-[var(--line)]" />
      {STEPS.map((step, i) => {
        const active = i === currentIndex;
        const done = currentIndex >= 0 && i < currentIndex;
        return (
          <Link
            key={step.n}
            href={step.href}
            className="flex-1 pr-3 pb-4 flex items-center gap-2.5 relative transition-opacity hover:opacity-85"
          >
            <span
              className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[11px] shrink-0 transition-all ${
                done
                  ? "border-[var(--teal)] text-[var(--teal)] bg-[color-mix(in_srgb,var(--teal)_10%,transparent)]"
                  : active
                    ? "border-[var(--gold)] text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]"
                    : "border-[var(--line-strong)] text-[var(--text-3)]"
              }`}
            >
              {done ? <Icon name="check" /> : step.n}
            </span>
            <span className={`text-[13px] font-medium max-[540px]:hidden ${active ? "text-[var(--text-1)]" : "text-[var(--text-3)]"}`}>
              {step.label}
            </span>
            {active && <span className="absolute bottom-[-1px] left-0 right-3 h-0.5 bg-[var(--gold)] z-[1]" />}
          </Link>
        );
      })}
    </div>
  );
}
