import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ACCESS_STATUSES, setAccessStatus, type AccessStatus } from "@/lib/access";
import { deleteUserAccount } from "@/lib/account";
import { isWordPressUser } from "@/lib/wordpress-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWordPressUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const status = body?.accessStatus as AccessStatus;
  if (!ACCESS_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await setAccessStatus(id, status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id, accessStatus: status });
}

// Deletes another user's account and all of their data (e.g. on their request).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWordPressUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete own account here" }, { status: 400 });
  }

  await deleteUserAccount(id);
  return NextResponse.json({ ok: true });
}
