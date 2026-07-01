import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import WeightDashboardWrapper from "@/app/dashboard/weight/WeightDashboardWrapper";

export default async function SharedWeightPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await validateSharedToken(token))) notFound();

  return <WeightDashboardWrapper apiBase={`/api/shared/${token}`} readOnly />;
}
