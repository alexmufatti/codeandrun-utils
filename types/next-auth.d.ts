import type { DefaultSession } from "next-auth";
import type { AccessStatus } from "@/lib/access";

declare module "next-auth" {
  interface Session {
    user: {
      isWpUser: boolean;
      accessStatus: AccessStatus;
      needsConsent: boolean;
      // Set for every signed-in user, approved or not. Only for the flows a
      // not-yet-admitted user must reach (consent, own export/deletion):
      // data routes must keep gating on `id`.
      accountId?: string;
    } & DefaultSession["user"];
  }
}
