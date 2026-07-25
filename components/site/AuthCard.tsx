"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/lib/icons";

export type AuthResult = { error?: string; info?: string } | void;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

export function AuthCard({
  title,
  subtitle,
  submitLabel,
  footer,
  children,
  onSubmit,
  onGoogle,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  footer: ReactNode;
  children: ReactNode;
  onSubmit: (formData: FormData) => Promise<AuthResult>;
  onGoogle?: () => Promise<AuthResult>;
}) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  async function handleGoogle() {
    if (!onGoogle) return;
    setGoogleLoading(true);
    setError(null);
    const result = await onGoogle();
    setGoogleLoading(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-[420px] bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-9 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <h1 className="font-[var(--font-display)] font-extrabold text-[26px] leading-tight m-0">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">{subtitle}</p>

        {onGoogle && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full mt-6 font-sans font-medium text-sm px-5 py-[11px] rounded-xl bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] text-[var(--text-1)] inline-flex items-center justify-center gap-3 transition-all hover:border-[var(--line-strong)] hover:bg-[var(--bg-3)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleLoading ? <Icon name="loader-2" spin /> : <GoogleIcon />}
              Continuar com Google
            </button>
            <div className="flex items-center gap-3 mt-6">
              <span className="h-px flex-1 bg-[var(--line)]" />
              <span className="text-xs text-[var(--text-3)]">ou</span>
              <span className="h-px flex-1 bg-[var(--line)]" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className={onGoogle ? "mt-6 flex flex-col gap-4" : "mt-7 flex flex-col gap-4"}>
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
