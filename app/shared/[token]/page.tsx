import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import WeekSummaryClient from "@/app/dashboard/WeekSummaryClient";

export default async function SharedSummaryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await validateSharedToken(token))) notFound();

  return (
    <WeekSummaryClient
      apiBase={`/api/shared/${token}`}
      basePath={`/shared/${token}`}
    />
  );
}
