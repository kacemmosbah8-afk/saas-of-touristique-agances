import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppProviders } from "@/shared/providers/app-providers";
import { siteConfig } from "@/features/marketing/lib/site-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif for headlines (h1/h2, see globals.css) — the
// sans stack above stays the only font everywhere else, including the
// dashboard, which needs density over display type.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  // No `template` here — every existing page in this app already sets a
  // complete title of its own (60+ pages, established convention); a
  // template would append the suffix a second time to every one of them.
  // This is only the fallback for a route with no title of its own.
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  // Traveler-facing keywords — this site is the agency's own storefront,
  // not software marketed to other agencies.
  keywords: [
    "وكالة سياحة وأسفار في الجزائر",
    "رحلات من الجزائر",
    "باقات سياحية",
    "حجز فنادق",
    "حجز رحلات طيران",
    "agence de voyage Algérie",
    "voyages organisés depuis Alger",
  ],
  authors: [{ name: siteConfig.companyLegalName }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
