import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntegrateOS — B2B Mapping Platform",
  description:
    "Collaborative EDI mapping platform that replaces Excel-based DMA workflows with an interactive workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700;800&family=Fira+Code:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
