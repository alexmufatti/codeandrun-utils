import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingContent from "@/components/LandingContent";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard/weight");
  }

  return <LandingContent />;
}
