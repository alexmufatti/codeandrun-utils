"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Button disabled>Loading...</Button>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        {session.user?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? "User"}
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm text-muted-foreground">
          {session.user?.name}
        </span>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          Logout
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => signIn("google", { callbackUrl: "/dashboard/weight" })}>
      Login con Google
    </Button>
  );
}
