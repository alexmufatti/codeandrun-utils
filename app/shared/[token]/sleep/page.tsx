import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import SleepPageClient from "@/app/dashboard/sleep/SleepPageClient";

export default async function SharedSleepPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await validateSharedToken(token))) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Sonno</h1>
      <SleepPageClient apiBase={`/api/shared/${token}`} readOnly />
    </main>
  );
}
