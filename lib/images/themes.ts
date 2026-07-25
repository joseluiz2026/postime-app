export const IMAGE_THEMES = [
  { id: "auto", label: "Automático", query: null },
  { id: "natureza", label: "Natureza", query: "nature landscape" },
  { id: "montanhas", label: "Montanhas", query: "mountains" },
  { id: "mar", label: "Mar", query: "ocean beach sea" },
  { id: "pessoas", label: "Pessoas", query: "people lifestyle portrait" },
  { id: "cidades", label: "Cidades", query: "city urban skyline" },
  { id: "carros", label: "Carros", query: "cars automotive" },
  { id: "tecnologia", label: "Tecnologia", query: "technology digital" },
  { id: "comida", label: "Comida", query: "food cuisine" },
  { id: "fitness", label: "Fitness", query: "fitness sport gym" },
  { id: "negocios", label: "Negócios", query: "business office professional" },
] as const;

export type ImageThemeId = (typeof IMAGE_THEMES)[number]["id"];

export function themeQueryFor(id: ImageThemeId | undefined): string | null {
  return IMAGE_THEMES.find((t) => t.id === id)?.query ?? null;
}
