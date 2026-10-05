import { auth } from "@/lib/auth";
import { isWordPressUser } from "@/lib/wordpress-auth";
import NewPostForm from "./NewPostForm";

export default async function NewPostPage() {
  const session = await auth();
  const isWpUser = isWordPressUser(session?.user?.email);

  if (!isWpUser) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-muted-foreground">Accesso non autorizzato.</p>
      </div>
    );
  }

  return <NewPostForm />;
}
