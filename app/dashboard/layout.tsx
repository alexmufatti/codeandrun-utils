import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardNav from "@/components/dashboard/DashboardNav";
import QuickNav from "@/components/dashboard/QuickNav";
import LoginButton from "@/components/auth/LoginButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LangToggle } from "@/components/ui/LangToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  if (session.user.accessStatus !== "approved") {
    redirect("/pending");
  }
  if (session.user.needsConsent) {
    redirect("/consent");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0">🏃</span>
            <span className="text-lg font-semibold whitespace-nowrap shrink-0">CodeAndRun</span>
            <DashboardNav isAdmin={session.user.isWpUser} />
          </div>
          <div className="flex items-center gap-1">
            <LangToggle />
            <ThemeToggle />
            <LoginButton />
          </div>
        </div>
      </header>
      <div className="pb-16">{children}</div>
      <QuickNav />
    </div>
  );
}
