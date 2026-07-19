"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode } from "react";
import { Icon } from "@/lib/icons";

export function AuthCard({
  title,
  subtitle,
  submitLabel,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push("/app/fonte");
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-[420px] bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-9 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <h1 className="font-[var(--font-display)] font-extrabold text-[26px] leading-tight m-0">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">{subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          {children}
          <button
            type="submit"
            className="font-sans font-semibold text-[15px] px-7 py-[15px] rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220] shadow-[0_8px_24px_rgba(56,189,248,0.25)] inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-px mt-2 cursor-pointer"
          >
            {submitLabel} <Icon name="arrow-right" />
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--text-3)] text-center">{footer}</p>
        <p className="mt-4 text-center">
          <Link href="/" className="text-xs text-[var(--text-3)] hover:text-[var(--gold)]">
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--text-2)] mb-2">{label}</span>
      <input
        {...props}
        className="w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[9px] text-[var(--text-1)] font-sans text-sm px-[14px] py-[11px] outline-none transition-all hover:border-[var(--line-strong)] focus:border-[var(--gold)] focus:bg-[var(--bg-3)] placeholder:text-[var(--text-3)]"
      />
    </label>
  );
}
