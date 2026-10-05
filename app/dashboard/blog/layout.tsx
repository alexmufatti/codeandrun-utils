import { auth } from "@/lib/auth";
import { isWordPressUser } from "@/lib/wordpress-auth";
import BlogTabs from "./BlogTabs";

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!isWordPressUser(session?.user?.email)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-muted-foreground">Accesso non autorizzato.</p>
      </div>
    );
  }

  return (
    <>
      <BlogTabs />
      {children}
    </>
  );
}
