"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/LanguageContext";

export default function LoginButton() {
  const { data: session, status } = useSession();
  const { t } = useTranslations();

  if (status === "loading") {
    return <Button disabled>{t.auth.loading}</Button>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        {session.user?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? "User"}
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm text-muted-foreground">
          {session.user?.name}
        </span>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          {t.auth.logout}
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => signIn("google", { callbackUrl: "/dashboard/weight" })}>
      {t.auth.loginGoogle}
    </Button>
  );
}
