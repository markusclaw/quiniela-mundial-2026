import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PoolProvider } from "@/components/pool-provider";
import { LocaleProvider } from "@/lib/i18n";

// Set NEXT_PUBLIC_SITE_URL to your deployed domain (e.g. on Cloudflare Pages)
// so link-preview crawlers resolve an absolute URL for the share image.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quiniela-mundial-2026.pages.dev";

const title = "Quiniela Mundial 2026";
const description =
  "Quiniela privada de la Copa Mundial FIFA 2026 — arma tu paquete, sigue tus equipos y escala la tabla.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: title,
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: title,
    title,
    description,
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#16624a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans">
        <LocaleProvider>
          <PoolProvider>{children}</PoolProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
