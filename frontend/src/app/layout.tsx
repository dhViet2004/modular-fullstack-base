import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoreStack",
  description: "A production-minded modular fullstack foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${display.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
