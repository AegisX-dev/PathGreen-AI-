import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PathGreen-AI | Real-Time Fleet Emissions Monitor",
  description: "Decarbonize Indian supply chains with real-time GPS and IoT streaming. Track fleet emissions, detect violations, and reduce carbon waste.",
  keywords: ["fleet management", "emissions monitoring", "BS-VI", "logistics", "carbon tracking", "real-time"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
        style={{
          fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
