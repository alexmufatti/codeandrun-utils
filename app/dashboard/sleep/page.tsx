import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SleepPageClient from "./SleepPageClient";

export default async function SleepPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Sleep Tracker</h1>
      <SleepPageClient />
    </main>
  );
}
