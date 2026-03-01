import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodeAndRun Apps",
  description: "Utility per atleti runner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <LanguageProvider>
            <SessionProvider>
              {children}
              <Toaster richColors position="top-right" />
            </SessionProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Script
          src="https://analytics.alexmufatti.it/script.js"
          data-website-id="4afb9f77-1f8a-40ec-ac15-1b007bd009a7"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
