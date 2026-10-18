import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordPrivacyConsent } from "@/lib/access";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy/content";

// Records acceptance of the current privacy policy. Gated on `accountId`
// because `session.user.id` is not set until this consent exists.
export async function POST() {
  const session = await auth();
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.accessStatus !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const saved = await recordPrivacyConsent(session.user.accountId, PRIVACY_POLICY_VERSION);
  if (!saved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, version: PRIVACY_POLICY_VERSION });
}
