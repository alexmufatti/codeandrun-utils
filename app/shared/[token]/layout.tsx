import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import SharedNav from "@/components/shared/SharedNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default async function SharedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shared = await validateSharedToken(token);
  if (!shared) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0">🏃</span>
            <span className="text-lg font-semibold whitespace-nowrap shrink-0">CodeAndRun</span>
            <SharedNav token={token} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 hidden sm:inline">
              sola lettura
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
