import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import StravaActivities from "@/app/dashboard/strava/StravaActivities";

export default async function SharedStravaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await validateSharedToken(token))) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Attività</h1>
      <StravaActivities
        isWpUser={false}
        apiBase={`/api/shared/${token}`}
        readOnly
      />
    </main>
  );
}
