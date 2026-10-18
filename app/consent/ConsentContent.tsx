"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { LangToggle } from "@/components/ui/LangToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function ConsentContent({ email }: { email: string }) {
  const { t } = useTranslations();
  const [policyRead, setPolicyRead] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAccept() {
    setSaving(true);
    const res = await fetch("/api/account/consent", { method: "POST" });
    if (!res.ok) {
      toast.error(t.privacy.consentError);
      setSaving(false);
      return;
    }
    // Full navigation: the dashboard layout must re-read the session.
    window.location.assign("/dashboard");
  }

  async function handleDelete() {
    if (!window.confirm(t.privacy.deleteConfirm)) return;
    setSaving(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail: email }),
    });
    if (!res.ok) {
      toast.error(t.privacy.deleteError);
      setSaving(false);
      return;
    }
    await signOut({ callbackUrl: "/" });
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-end p-3 gap-1">
        <LangToggle />
        <ThemeToggle />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-4xl">🏃</span>
            <h1 className="text-2xl font-bold tracking-tight">{t.privacy.consentTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {t.privacy.consentIntro}{" "}
              <Link href="/privacy" target="_blank" className="underline hover:text-foreground">
                {t.privacy.link}
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                checked={policyRead}
                onChange={(e) => setPolicyRead(e.target.checked)}
              />
              {t.privacy.consentPolicy}
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                checked={healthConsent}
                onChange={(e) => setHealthConsent(e.target.checked)}
              />
              {t.privacy.consentHealth}
            </label>
          </div>

          <Button disabled={!policyRead || !healthConsent || saving} onClick={handleAccept}>
            {saving ? t.privacy.consentSaving : t.privacy.consentAccept}
          </Button>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{t.privacy.consentDecline}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                {t.auth.logout}
              </Button>
              <Button variant="ghost" size="sm" disabled={saving} onClick={handleDelete}>
                {t.privacy.deleteAccount}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
