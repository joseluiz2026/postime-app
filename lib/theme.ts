export type ThemeId = "warm" | "blue" | "green" | "lilac" | "graylight" | "black";

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "blue", label: "Azul", swatch: "linear-gradient(135deg,#38BDF8,#6366F1)" },
  { id: "green", label: "Verde", swatch: "linear-gradient(135deg,#4ADE80,#A3E635)" },
  { id: "lilac", label: "Lilás", swatch: "linear-gradient(135deg,#C49EFF,#9D5CE0)" },
  { id: "graylight", label: "Cinza-azulado claro", swatch: "linear-gradient(135deg,#8FA9C2,#4C7A8C)" },
  { id: "black", label: "Preto", swatch: "linear-gradient(135deg,#3A3A3A,#000000)" },
  { id: "warm", label: "Quente", swatch: "linear-gradient(135deg,#FF6B35,#B565F0)" },
];

export const DEFAULT_THEME: ThemeId = "blue";

export const THEME_STORAGE_KEY = "postime-theme";
