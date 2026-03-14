import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/lib/providers";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://retex360.fr';

export const metadata: Metadata = {
  title: {
    default: 'RETEX360 | Plateforme Collaborative RETEX SDIS',
    template: '%s | RETEX360',
  },
  description:
    'Plateforme collaborative des Retours d\'Expérience (RETEX) pour les SDIS français. Partagez, analysez et capitalisez vos interventions.',
  metadataBase: new URL(appUrl),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'RETEX360',
    title: 'RETEX360 | Plateforme Collaborative RETEX SDIS',
    description:
      'Partagez, analysez et capitalisez les retours d\'expérience des interventions des SDIS français.',
    url: appUrl,
  },
  twitter: {
    card: 'summary',
    title: 'RETEX360 | Plateforme Collaborative RETEX SDIS',
    description:
      'Partagez, analysez et capitalisez les retours d\'expérience des interventions des SDIS français.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} font-mono antialiased`}>
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
          >
            Aller au contenu principal
          </a>
          {children}
          <Toaster />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
