export function SiteFooter() {
  return (
    <footer className="border-t-[0.5px] border-[var(--line)]">
      <div className="max-w-[1120px] mx-auto px-8 py-8 flex justify-between flex-wrap gap-2 text-sm text-[var(--text-3)]">
        <span>
          © 2026 POST<span className="text-[var(--gold)]">i</span>
          <span className="bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] bg-clip-text text-transparent">me</span>. Todos os
          direitos reservados.
        </span>
        <span>Feito para quem posta todo dia.</span>
      </div>
    </footer>
  );
}
