import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import HrvPageClient from "@/app/dashboard/hrv/HrvPageClient";

export default async function SharedHrvPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await validateSharedToken(token))) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">HRV & Frequenza Cardiaca a riposo</h1>
      <HrvPageClient apiBase={`/api/shared/${token}`} readOnly />
    </main>
  );
}
