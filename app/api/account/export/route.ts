import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportUserData } from "@/lib/account";

export async function GET() {
  const session = await auth();
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await exportUserData(session.user.accountId);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="codeandrun-export-${date}.json"`,
    },
  });
}
