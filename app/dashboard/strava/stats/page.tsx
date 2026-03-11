import { auth } from "@/lib/auth";
import { isWordPressUser } from "@/lib/wordpress-auth";
import StatsClient from "./StatsClient";

export default async function StatsPage() {
  const session = await auth();
  const isWpUser = isWordPressUser(session?.user?.email);
  return <StatsClient isWpUser={isWpUser} />;
}
