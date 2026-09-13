"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Scale, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/LanguageContext";

const ITEMS = [
  { href: "/dashboard", icon: Home, exact: true, labelKey: "home" as const },
  { href: "/dashboard/weight", icon: Scale, exact: false, labelKey: "weightTracker" as const },
  { href: "/dashboard/habits", icon: ListChecks, exact: false, labelKey: "habitTracker" as const },
];

// Fixed bottom shortcut bar for the pages that get filled in on the go
// (weight, habit check-ins) — faster than opening the drawer, on mobile
// and desktop alike.
export default function QuickNav() {
  const pathname = usePathname();
  const { t } = useTranslations();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-5xl mx-auto flex">
        {ITEMS.map(({ href, icon: Icon, exact, labelKey }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 sm:flex-none sm:w-36 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {t.nav[labelKey]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
