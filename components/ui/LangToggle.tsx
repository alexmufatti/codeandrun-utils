"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/translations";

const LOCALES: Locale[] = ["it", "en"];

export function LangToggle() {
  const { locale, setLocale } = useTranslations();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="sm" className="w-9 h-9" disabled />;
  }

  const next = LOCALES.find((l) => l !== locale) ?? "it";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(next)}
      className="font-medium text-xs px-2"
      aria-label="Switch language"
    >
      {locale.toUpperCase()}
    </Button>
  );
}
