import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAccessUsers } from "@/lib/access";
import { isWordPressUser } from "@/lib/wordpress-auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWordPressUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await listAccessUsers();
  return NextResponse.json(
    users.map((u) => ({ ...u, isAdmin: isWordPressUser(u.email) }))
  );
}
