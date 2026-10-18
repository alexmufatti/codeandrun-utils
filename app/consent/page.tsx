import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ConsentContent from "./ConsentContent";

export default async function ConsentPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  if (session.user.accessStatus !== "approved") {
    redirect("/pending");
  }
  if (!session.user.needsConsent) {
    redirect("/dashboard");
  }

  return <ConsentContent email={session.user.email ?? ""} />;
}
