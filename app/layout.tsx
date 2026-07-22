import type { Metadata } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const title = "POSTime — Poste todo dia, sem gravar todo dia";
const description =
  "Transforme qualquer PDF, tema ou vídeo em roteiros, narração e vídeos verticais prontos pra TikTok, Instagram e YouTube — em minutos, com a sua própria voz.";
const siteUrl = "https://postime-app.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · POSTime",
  },
  description,
  keywords: [
    "gerador de vídeo com IA",
    "vídeo para TikTok e Instagram",
    "roteiro automático",
    "narração com IA",
    "conteúdo diário",
    "Reels e Shorts",
  ],
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "POSTime",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/images/hero.jpg", width: 1200, height: 675, alt: "POSTime — motor de conteúdo com IA para vídeos verticais" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/hero.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
