"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/LanguageContext";

export default function DashboardNav() {
  const pathname = usePathname();
  const { t } = useTranslations();

  const NAV_LINKS = [
    { href: "/dashboard/weight", label: t.nav.weightTracker },
    { href: "/dashboard/pace", label: t.nav.racePlanner },
    { href: "/dashboard/vdot", label: t.nav.trainingZones },
  ];

  return (
    <nav className="flex items-center gap-1">
      {NAV_LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
