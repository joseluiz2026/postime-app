"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/lib/icons";

export type AuthResult = { error?: string; info?: string } | void;

export function AuthCard({
  title,
  subtitle,
  submitLabel,
  footer,
  children,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  footer: ReactNode;
  children: ReactNode;
  onSubmit: (formData: FormData) => Promise<AuthResult>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const result = await onSubmit(new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error);
    if (result?.info) setInfo(result.info);
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-[420px] bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-9 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <h1 className="font-[var(--font-display)] font-extrabold text-[26px] leading-tight m-0">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">{subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          {children}

          {error && (
            <p className="text-[13px] text-[var(--gold)] leading-relaxed">
              <Icon name="alert-triangle" /> {error}
            </p>
          )}
          {info && <p className="text-[13px] text-[var(--teal)] leading-relaxed">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="font-sans font-semibold text-[15px] px-7 py-[15px] rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] text-[#0B1220] shadow-[0_8px_24px_rgba(56,189,248,0.25)] inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-px mt-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? <Icon name="loader-2" spin /> : <Icon name="arrow-right" />}
            {loading ? "Só um instante..." : submitLabel}
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
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--text-2)] mb-2">{label}</span>
      <div className="relative">
        <input
          {...props}
          type={isPassword ? (visible ? "text" : "password") : type}
          className={`w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[9px] text-[var(--text-1)] font-sans text-sm px-[14px] py-[11px] outline-none transition-all hover:border-[var(--line-strong)] focus:border-[var(--gold)] focus:bg-[var(--bg-3)] placeholder:text-[var(--text-3)] ${isPassword ? "pr-11" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 text-[var(--text-3)] cursor-pointer flex items-center transition-colors hover:text-[var(--gold)]"
          >
            <Icon name={visible ? "eye-off" : "eye"} />
          </button>
        )}
      </div>
    </label>
  );
}
