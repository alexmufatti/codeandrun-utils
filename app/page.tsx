import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginButton from "@/components/auth/LoginButton";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard/weight");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 text-center px-4">
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl">🏃</span>
          <h1 className="text-3xl font-bold tracking-tight">CodeAndRun Apps</h1>
          <p className="text-muted-foreground max-w-md">
            Utility per atleti runner. Traccia il tuo peso, monitora i progressi
            e raggiungi i tuoi obiettivi.
          </p>
        </div>
        <LoginButton />
      </div>
    </main>
  );
}
