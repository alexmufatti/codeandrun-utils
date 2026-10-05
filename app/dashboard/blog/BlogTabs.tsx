"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/LanguageContext";

export default function BlogTabs() {
  const pathname = usePathname();
  const { t } = useTranslations();

  const tabs = [
    { href: "/dashboard/blog/posts/new", label: t.nav.newPost, exact: false },
    { href: "/dashboard/blog/media", label: t.nav.media, exact: false },
  ];

  return (
    <div className="border-b border-border">
      <nav className="max-w-5xl mx-auto px-4 flex gap-1">
        {tabs.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                active
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
