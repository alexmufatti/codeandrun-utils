import { redirect } from "next/navigation";

export default async function SharedMealsRedirect({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/shared/${token}/meals`);
}
