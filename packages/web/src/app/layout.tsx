import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Plus_Jakarta_Sans } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "CodeMind — Ship without fear", template: "%s | CodeMind" },
  description: "X-ray vision for your codebase. See the blast radius of any change before it ships. Trace errors to their origin. Compare architecture diagrams against real code.",
  keywords: ["code analysis", "blast radius", "dependency graph", "MCP", "developer tools", "Claude"],
  authors: [{ name: "Atnia Solutions Pvt Limited" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://codemind.dev",
    title: "CodeMind — Ship without fear",
    description: "X-ray vision for your codebase. Locally indexed. Offline. Free.",
    siteName: "CodeMind",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeMind — Ship without fear",
    description: "X-ray vision for your codebase. Locally indexed. Offline. Free.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#020205",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <body className="bg-[--bg] text-[--ink] font-body antialiased">{children}</body>
    </html>
  );
}
