import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MealsPageClient from "@/components/meals/MealsPageClient";

export default async function MealsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <MealsPageClient />
    </main>
  );
}
