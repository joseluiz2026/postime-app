"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon } from "@/lib/icons";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-[14px] p-7 mb-4 shadow-[0_1px_0_rgba(0,0,0,0.15)] ${className}`}
    >
      {children}
    </div>
  );
}

type BtnVariant = "default" | "primary" | "ghost";

export function Btn({
  variant = "default",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base =
    "font-sans text-[13px] font-medium px-[18px] py-[10px] rounded-[9px] cursor-pointer inline-flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const variants: Record<BtnVariant, string> = {
    default:
      "border-[0.5px] border-[var(--line-strong)] bg-transparent text-[var(--text-1)] hover:bg-[var(--bg-2)] hover:border-[var(--text-3)]",
    primary: "border-[0.5px] border-[var(--gold)] bg-[var(--gold)] text-[#20200E] font-semibold hover:bg-[var(--gold-soft)] hover:border-[var(--gold-soft)]",
    ghost: "border-[0.5px] border-transparent text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function IconBtn({
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`bg-transparent border-[0.5px] border-[var(--line)] rounded-[7px] px-[9px] py-[7px] text-[var(--text-2)] cursor-pointer text-[15px] transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] hover:bg-[color-mix(in_srgb,var(--gold)_6%,transparent)] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Pill({
  selected,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      className={`font-mono text-xs px-[15px] py-[7px] rounded-full border-[0.5px] cursor-pointer transition-all ${
        selected
          ? "border-[var(--teal)] text-[var(--teal)] bg-[color-mix(in_srgb,var(--teal)_10%,transparent)]"
          : "border-[var(--line)] text-[var(--text-2)] hover:border-[var(--line-strong)]"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-[var(--text-2)] mb-2">
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[9px] text-[var(--text-1)] font-sans text-sm px-[14px] py-[11px] outline-none transition-all hover:border-[var(--line-strong)] focus:border-[var(--gold)] focus:bg-[var(--bg-3)] placeholder:text-[var(--text-3)] ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-[9px] text-[var(--text-1)] font-sans text-sm px-[14px] py-[11px] outline-none transition-all resize-y min-h-[90px] leading-relaxed hover:border-[var(--line-strong)] focus:border-[var(--gold)] focus:bg-[var(--bg-3)] placeholder:text-[var(--text-3)] ${props.className ?? ""}`}
    />
  );
}

export function HelpTip({ text, label }: { text: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle ml-1.5">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="w-4 h-4 rounded-full border border-[var(--line-strong)] bg-transparent text-[var(--text-3)] text-[10px] font-semibold flex items-center justify-center cursor-pointer font-mono leading-none p-0 transition-all hover:border-[var(--gold)] hover:text-[var(--gold)]"
      >
        ?
      </button>
      {open && (
        <span className="absolute bottom-[calc(100%+9px)] left-1/2 -translate-x-1/2 w-[220px] max-w-[calc(100vw-48px)] bg-[var(--bg-3)] border-[0.5px] border-[var(--line-strong)] rounded-lg px-3 py-2.5 text-[11.5px] leading-relaxed text-[var(--text-2)] shadow-[0_8px_20px_rgba(0,0,0,0.35)] z-30 text-left font-normal">
          {text}
        </span>
      )}
    </span>
  );
}

export function Dropzone({
  title,
  subtitle,
  icon,
  onFiles,
  accept,
  multiple,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onFiles: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={`border-[1.5px] border-dashed rounded-xl px-5 py-8 text-center cursor-pointer transition-all ${
        dragOver ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_5%,transparent)]" : "border-[var(--line-strong)]"
      }`}
    >
      <Icon name={icon} className="text-[26px] text-[var(--gold)] mb-2 block" />
      <div className="text-[13.5px] text-[var(--text-1)] font-medium mb-0.5">{title}</div>
      <div className="text-xs text-[var(--text-3)]">{subtitle}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}

export function ModalShell({
  open,
  onClose,
  icon,
  title,
  children,
  closable = true,
}: {
  open: boolean;
  onClose: () => void;
  icon?: string;
  title: string;
  children: ReactNode;
  closable?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/72 flex items-center justify-center z-[1000] p-5"
      onClick={(e) => {
        if (closable && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-[var(--bg-1)] border-[0.5px] border-[var(--line-strong)] rounded-[18px] p-8 max-w-[420px] w-full shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        {closable && (
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="absolute top-4 right-4 bg-transparent border-none text-[var(--text-3)] cursor-pointer text-xl leading-none hover:text-[var(--gold)]"
          >
            ×
          </button>
        )}
        <div className="flex items-center gap-3 mb-2">
          {icon && <Icon name={icon} className="text-[26px] text-[var(--gold)]" />}
          <h2 className="m-0 text-[21px] font-bold text-[var(--text-1)] font-[var(--font-display)]">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
