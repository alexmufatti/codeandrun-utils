import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/account";

// Deletes the signed-in user's account and all of their data.
// The body must repeat the account email, as a guard against accidental calls.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const confirmEmail = typeof body?.confirmEmail === "string" ? body.confirmEmail.trim() : "";
  if (
    !session.user.email ||
    confirmEmail.toLowerCase() !== session.user.email.toLowerCase()
  ) {
    return NextResponse.json({ error: "Email confirmation mismatch" }, { status: 400 });
  }

  await deleteUserAccount(session.user.accountId);
  return NextResponse.json({ ok: true });
}
