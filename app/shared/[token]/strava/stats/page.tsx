import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import StatsClient from "@/app/dashboard/strava/stats/StatsClient";

export default async function SharedStatsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await validateSharedToken(token))) notFound();

  return (
    <StatsClient
      isWpUser={false}
      apiBase={`/api/shared/${token}`}
      readOnly
    />
  );
}
