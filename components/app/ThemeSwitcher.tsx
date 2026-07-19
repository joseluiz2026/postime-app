"use client";

import { THEMES } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="mt-6 px-4 py-3.5 bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] rounded-xl">
      <label className="block text-xs font-medium text-[var(--text-2)] mb-3">Paleta de cores</label>
      <div className="flex gap-2" role="group" aria-label="Escolher tema de cores">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            title={t.label}
            aria-label={`Tema ${t.label}`}
            className={`w-[18px] h-[18px] p-[1px] rounded-full border-[1.5px] cursor-pointer transition-all ${
              theme === t.id ? "border-[var(--text-1)]" : "border-transparent hover:border-[var(--line-strong)]"
            }`}
          >
            <span
              className="block w-full h-full rounded-full"
              style={{
                background: t.swatch,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.35)",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
