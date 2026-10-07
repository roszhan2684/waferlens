import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";
import "./components.css";

const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "WaferLens · Inference performance you can prove", template: "%s · WaferLens" },
  description:
    "WaferLens profiles real inference workloads, ranks evidence-backed bottleneck hypotheses, runs controlled replays, blocks invalid benchmark wins, and watches production for regressions. Independent project, not affiliated with Wafer.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
