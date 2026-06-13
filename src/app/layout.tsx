import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PoolProvider } from "@/components/pool-provider";
import { LocaleProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Quiniela Mundial 2026",
  description:
    "A private World Cup 2026 pool — pick your package, follow your teams, climb the table.",
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
      <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "2de2d90d84be471093e08ee421d40329"}'></script></body>
    </html>
  );
}
