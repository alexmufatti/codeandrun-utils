import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import HrPage from "@/app/dashboard/hr/page";

export default async function SharedHrPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await validateSharedToken(token))) notFound();
  return <HrPage />;
}
