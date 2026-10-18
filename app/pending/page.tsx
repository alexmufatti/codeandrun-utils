import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PendingContent from "./PendingContent";

export default async function PendingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  if (session.user.accessStatus === "approved") {
    redirect("/dashboard");
  }

  return <PendingContent rejected={session.user.accessStatus === "rejected"} />;
}
