"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/LanguageContext";

export default function DashboardNav() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const NAV_LINKS = [
    { href: "/dashboard/strava", label: t.nav.activities, exact: true },
    { href: "/dashboard/strava/stats", label: t.nav.runningStats, exact: false },
    { href: "/dashboard/hrv", label: t.nav.hrvRestHr, exact: false },
    { href: "/dashboard/weight", label: t.nav.weightTracker },
    { href: "/dashboard/pace", label: t.nav.racePlanner },
    { href: "/dashboard/vdot", label: t.nav.trainingZones },
    { href: "/dashboard/hr", label: t.nav.hrZones },
  ];

  const isLinkActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const active = NAV_LINKS.find(({ href, exact }) => isLinkActive(href, exact));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          open
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="hidden sm:inline">{active?.label ?? "Menu"}</span>
        <svg
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-44 rounded-lg border border-border bg-background shadow-lg py-1">
          {NAV_LINKS.map(({ href, label, exact }) => {
            const isActive = isLinkActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
