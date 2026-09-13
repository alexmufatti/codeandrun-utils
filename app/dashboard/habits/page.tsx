import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import HabitsPageClient from "@/components/habits/HabitsPageClient";

export default async function HabitsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <HabitsPageClient />
    </main>
  );
}
