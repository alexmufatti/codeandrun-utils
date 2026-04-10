"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { Menu, X } from "lucide-react";

export default function DashboardNav() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);

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

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Desktop: inline links */}
      <nav className="hidden md:flex items-center gap-0.5">
        {NAV_LINKS.map(({ href, label, exact }) => {
          const isActive = isLinkActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Apri menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border flex flex-col md:hidden transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏃</span>
            <span className="text-base font-semibold">CodeAndRun</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer links */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label, exact }) => {
            const isActive = isLinkActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
