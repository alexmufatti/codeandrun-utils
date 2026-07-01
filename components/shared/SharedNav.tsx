"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

export default function SharedNav({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/shared/${token}`;
  const [open, setOpen] = useState(false);

  const NAV_LINKS = [
    { href: base, label: "Riepilogo", exact: true },
    { href: `${base}/strava`, label: "Attività", exact: true },
    { href: `${base}/strava/stats`, label: "Statistiche", exact: false },
    { href: `${base}/hrv`, label: "HRV / FC riposo", exact: false },
    { href: `${base}/sleep`, label: "Sonno", exact: false },
    { href: `${base}/meals`, label: "Menu", exact: false },
    { href: `${base}/weight`, label: "Peso", exact: false },
    { href: `${base}/pace`, label: "Race planner", exact: false },
    { href: `${base}/vdot`, label: "Zone allenamento", exact: false },
    { href: `${base}/hr`, label: "Zone FC", exact: false },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Apri menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
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

        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs text-muted-foreground">Vista condivisa — sola lettura</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive(href, exact)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
