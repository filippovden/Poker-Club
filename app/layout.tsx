import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";
import { Analytics } from "@/components/analytics";
import { AmbientParticles } from "@/components/ambient-particles";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { AgeGate } from "@/components/age-gate";
import { ScrollToTop } from "@/components/scroll-to-top";
import { StickyMobileCta } from "@/components/sticky-mobile-cta";
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

const DEFAULT_TITLE = `${SITE_CONTENT.clubName} — покерный клуб в Тольятти`;
const DEFAULT_DESCRIPTION =
  "Закрытый клуб турнирного покера в Тольятти. Живые турниры по No-Limit Hold'em и Pot-Limit Omaha каждую неделю — запись на сайте и в Telegram.";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SITE_CONTENT.domain}`),
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${SITE_CONTENT.clubName}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "покерный клуб Тольятти",
    "турниры по покеру Тольятти",
    "Royal63",
    "No-Limit Hold'em",
    "Pot-Limit Omaha",
    "покер турниры",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "OraIoONcgNFJjf20C_Ij78iRxBnv9drFCAdnusvsQwE",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: SITE_CONTENT.clubName,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: SITE_CONTENT.clubName,
  description: DEFAULT_DESCRIPTION,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE_CONTENT.venue,
    addressLocality: "Тольятти",
    addressCountry: "RU",
  },
  url: `https://${SITE_CONTENT.domain}`,
  sameAs: [`https://t.me/${SITE_CONTENT.contacts.telegram.replace(/^@/, "")}`],
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
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <AmbientParticles />
        <AgeGate />
        <ServiceWorkerRegister />
        {children}
        <ScrollToTop />
        <StickyMobileCta />
      </body>
    </html>
  );
}
