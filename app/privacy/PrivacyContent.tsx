"use client";

import Link from "next/link";
import { useTranslations, interpolate } from "@/lib/i18n/LanguageContext";
import { privacyPolicy, PRIVACY_POLICY_VERSION } from "@/lib/privacy/content";
import { LangToggle } from "@/components/ui/LangToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function PrivacyContent({
  controller,
  email,
}: {
  controller: string;
  email: string;
}) {
  const { locale } = useTranslations();
  const policy = privacyPolicy[locale];
  const fill = (text: string) => interpolate(text, { controller, email });

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold">
            <span className="text-xl">🏃</span>
            CodeAndRun Apps
          </Link>
          <div className="flex gap-1">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">{policy.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {policy.updated}: {PRIVACY_POLICY_VERSION}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{policy.intro}</p>

        {policy.sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">{section.title}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="text-sm leading-relaxed">
                {fill(p)}
              </p>
            ))}
            {section.items && (
              <ul className="list-disc pl-5 flex flex-col gap-1">
                {section.items.map((item) => (
                  <li key={item} className="text-sm leading-relaxed">
                    {fill(item)}
                  </li>
                ))}
              </ul>
            )}
            {section.after?.map((p) => (
              <p key={p} className="text-sm leading-relaxed">
                {fill(p)}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
