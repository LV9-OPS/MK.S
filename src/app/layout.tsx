import type { Metadata, Viewport } from "next";
import { Inter, Oxanium } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const oxanium = Oxanium({ subsets: ["latin"], variable: "--font-oxanium", display: "swap", weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "MK.S — Esport Call of Duty", template: "%s · MK.S" },
  description: "Plateforme de l'équipe MK.S : méta Call of Duty, tournois cashprize, ressources de l'équipe et suivi des statistiques hebdomadaires.",
};

export const viewport: Viewport = { themeColor: "#0a0c0f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${oxanium.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="contenu" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} MK.S — Équipe esport Call of Duty.</p>
            <p>
              Call of Duty est une marque d&apos;Activision. Méta d&apos;après des sources publiques citées sur chaque fiche ;{" "}
              <Link href="/meta" className="link">voir les sources</Link>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
