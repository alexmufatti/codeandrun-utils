"use client";

import Link from "next/link";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import LoginButton from "@/components/auth/LoginButton";
import { LangToggle } from "@/components/ui/LangToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function LandingContent() {
  const { t } = useTranslations();

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-end p-3 gap-1">
        <LangToggle />
        <ThemeToggle />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-8 text-center px-4">
          <div className="flex flex-col items-center gap-2">
            <span className="text-5xl">🏃</span>
            <h1 className="text-3xl font-bold tracking-tight">CodeAndRun Apps</h1>
            <p className="text-muted-foreground max-w-md">{t.home.tagline}</p>
          </div>
          <LoginButton />
          <p className="text-xs text-muted-foreground max-w-md">
            {t.privacy.loginNotice}{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              {t.privacy.link}
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
