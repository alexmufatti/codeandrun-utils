import DashboardNav from "@/components/dashboard/DashboardNav";
import LoginButton from "@/components/auth/LoginButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">🏃</span>
            <span className="text-lg font-semibold whitespace-nowrap">CodeAndRun</span>
            <DashboardNav />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LoginButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
