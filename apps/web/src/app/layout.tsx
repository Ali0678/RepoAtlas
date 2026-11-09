import type { Metadata } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});

const displayFont = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "RepoAtlas",
  description: "Interactive architecture maps for GitHub repositories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${monoFont.variable} ${displayFont.variable}`}>
      <body className="min-h-full bg-surface-base text-text-primary antialiased selection:bg-accent/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
