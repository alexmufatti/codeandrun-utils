"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/i18n/LanguageContext";

export default function AccountData() {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const email = session?.user?.email ?? "";
  const canDelete =
    !!email && confirmEmail.trim().toLowerCase() === email.toLowerCase() && !deleting;

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail }),
    });
    if (!res.ok) {
      toast.error(t.account.deleteError);
      setDeleting(false);
      return;
    }
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{t.account.exportTitle}</p>
          <p className="text-xs text-muted-foreground">{t.account.exportDesc}</p>
          <Link href="/privacy" className="text-xs text-muted-foreground underline hover:text-foreground">
            {t.privacy.link}
          </Link>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/api/account/export" download>
            {t.account.exportBtn}
          </a>
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div>
          <p className="text-sm font-medium text-destructive">{t.account.deleteTitle}</p>
          <p className="text-xs text-muted-foreground">{t.account.deleteDesc}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-email" className="text-xs">
            {t.account.deleteConfirmLabel} <span className="font-mono">{email}</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="confirm-email"
              type="email"
              autoComplete="off"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="max-w-xs"
            />
            <Button variant="destructive" size="sm" disabled={!canDelete} onClick={handleDelete}>
              {deleting ? t.account.deletingBtn : t.account.deleteBtn}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
