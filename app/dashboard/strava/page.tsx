import { auth } from "@/lib/auth";
import { isWordPressUser } from "@/lib/wordpress-auth";
import StravaPageClient from "./StravaPageClient";

export default async function StravaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const isWpUser = isWordPressUser(session?.user?.email);
  return <StravaPageClient error={error ?? null} isWpUser={isWpUser} />;
}
