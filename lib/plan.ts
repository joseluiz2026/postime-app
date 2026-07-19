export type Plan = "free" | "pro";

/** Free: 3 vídeos/dia (dias 1-3) → 2/dia (dias 4-6) → 1/dia (dias 7-9) → bloqueado (dia 10+) */
export function getFreeLimit(day: number): number {
  if (day <= 3) return 3;
  if (day <= 6) return 2;
  if (day <= 9) return 1;
  return 0;
}
