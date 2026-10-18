import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { authConfig } from "@/auth.config";
import { clientPromise, AUTH_DB_NAME } from "@/lib/mongo-client";
import { getAccessState } from "@/lib/access";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy/content";
import { notifyAccessRequest } from "@/lib/email/notifyAccessRequest";
import { isWordPressUser } from "@/lib/wordpress-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: AUTH_DB_NAME,
  }),
  events: {
    async createUser({ user }) {
      if (isWordPressUser(user.email)) return;
      try {
        await notifyAccessRequest(user.name ?? null, user.email ?? null);
      } catch (err) {
        console.error("Access request notification failed:", err);
      }
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      // On first sign-in, user object is available — persist the id in the token
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) return session;

      const isWpUser = isWordPressUser(session.user.email);
      const userId = typeof token.id === "string" ? token.id : null;
      // The admin is always approved and does not go through the consent step.
      const state = !isWpUser && userId ? await getAccessState(userId) : null;
      const accessStatus = isWpUser ? "approved" : (state?.accessStatus ?? "pending");
      const needsConsent = !isWpUser && state?.consentVersion !== PRIVACY_POLICY_VERSION;

      session.user.isWpUser = isWpUser;
      session.user.accessStatus = accessStatus;
      session.user.needsConsent = needsConsent;
      if (userId) {
        session.user.accountId = userId;
      }
      // Every API route gates on `session.user.id`: leaving it unset until the
      // user is approved and has accepted the privacy policy makes them all
      // answer 401 without per-route checks.
      if (userId && accessStatus === "approved" && !needsConsent) {
        session.user.id = userId;
      }
      return session;
    },
  },
});
