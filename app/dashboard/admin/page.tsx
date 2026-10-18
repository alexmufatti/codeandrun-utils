import { auth } from "@/lib/auth";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isWpUser) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-muted-foreground">Accesso non autorizzato.</p>
      </div>
    );
  }

  return <AdminUsersClient />;
}
