import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import VdotPage from "@/app/dashboard/vdot/page";

export default async function SharedVdotPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await validateSharedToken(token))) notFound();
  return <VdotPage />;
}
