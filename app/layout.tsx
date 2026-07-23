import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";
import { CustomCursor } from "@/components/custom-cursor";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { AgeGate } from "@/components/age-gate";
import { SITE_CONTENT } from "@/lib/content";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const displayFont = Unbounded({
  variable: "--font-display-face",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SITE_CONTENT.domain}`),
  title: {
    default: `${SITE_CONTENT.clubName} — турнирный покер-клуб`,
    template: `%s — ${SITE_CONTENT.clubName}`,
  },
  description:
    "Закрытый клуб турнирного покера. Живые турниры по No-Limit Hold'em и Pot-Limit Omaha каждую неделю.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      data-theme="dark"
      data-age-gate="pending"
      className={`${inter.variable} ${displayFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <AgeGate />
        <CustomCursor />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
