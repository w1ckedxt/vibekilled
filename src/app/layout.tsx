import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "./query-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const title = "VibeKilled.rip — Dev Down Detector";
const description =
  "The misery-loves-company map for developers who just hit the wall. Log your 429, watch the world resurrect, and feel a little less alone.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "VibeKilled.rip",
  metadataBase: new URL("https://vibekilled.rip"),
  openGraph: { title, description, type: "website", url: "https://vibekilled.rip" },
  twitter: { card: "summary_large_image", title, description },
  // Use the app/icon.svg skull (the old /favicon.ico override pointed at a file
  // that doesn't exist, so no favicon showed at all).
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // map handles its own zoom; stop the page from pinch-zooming
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
