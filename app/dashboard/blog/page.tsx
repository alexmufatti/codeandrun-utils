import { redirect } from "next/navigation";

export default function BlogPage() {
  redirect("/dashboard/blog/posts/new");
}
