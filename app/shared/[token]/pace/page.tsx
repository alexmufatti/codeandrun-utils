import { notFound } from "next/navigation";
import { validateSharedToken } from "@/lib/shared/validateToken";
import PacePage from "@/app/dashboard/pace/page";

export default async function SharedPacePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await validateSharedToken(token))) notFound();
  return <PacePage />;
}
