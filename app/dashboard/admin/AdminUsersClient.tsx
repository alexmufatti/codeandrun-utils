"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations, interpolate } from "@/lib/i18n/LanguageContext";
import type { AccessStatus, AccessUser } from "@/lib/access";

type AdminUser = AccessUser & { isAdmin: boolean };

const STATUS_ORDER: Record<AccessStatus, number> = { pending: 0, approved: 1, rejected: 2 };

export default function AdminUsersClient() {
  const { t, locale } = useTranslations();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      toast.error(t.admin.loadError);
      setUsers([]);
      return;
    }
    setUsers(await res.json());
  }, [t.admin.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, accessStatus: AccessStatus) => {
    setSavingId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessStatus }),
    });
    setSavingId(null);
    if (!res.ok) {
      toast.error(t.admin.updateError);
      return;
    }
    setUsers((prev) => prev?.map((u) => (u.id === id ? { ...u, accessStatus } : u)) ?? null);
  };

  const deleteUser = async (user: AdminUser) => {
    const label = user.email ?? user.name ?? user.id;
    if (!window.confirm(interpolate(t.admin.deleteConfirm, { email: label }))) return;
    setSavingId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    setSavingId(null);
    if (!res.ok) {
      toast.error(t.admin.deleteError);
      return;
    }
    setUsers((prev) => prev?.filter((u) => u.id !== user.id) ?? null);
  };

  const statusLabel: Record<AccessStatus, string> = {
    pending: t.admin.statusPending,
    approved: t.admin.statusApproved,
    rejected: t.admin.statusRejected,
  };

  const sorted = [...(users ?? [])].sort(
    (a, b) => STATUS_ORDER[a.accessStatus] - STATUS_ORDER[b.accessStatus]
  );

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t.admin.title}</h1>
      {users !== null && sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">{t.admin.empty}</p>
      )}
      {sorted.map((user) => (
        <Card key={user.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{user.name ?? user.email}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              <span className="text-xs text-muted-foreground">
                {t.admin.requestedOn} {new Date(user.requestedAt).toLocaleDateString(locale)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {user.isAdmin ? t.admin.adminBadge : statusLabel[user.accessStatus]}
              </span>
              {!user.isAdmin && user.accessStatus !== "approved" && (
                <Button
                  size="sm"
                  disabled={savingId === user.id}
                  onClick={() => updateStatus(user.id, "approved")}
                >
                  {t.admin.approveBtn}
                </Button>
              )}
              {!user.isAdmin && user.accessStatus === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingId === user.id}
                  onClick={() => updateStatus(user.id, "rejected")}
                >
                  {t.admin.rejectBtn}
                </Button>
              )}
              {!user.isAdmin && user.accessStatus === "approved" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingId === user.id}
                  onClick={() => updateStatus(user.id, "rejected")}
                >
                  {t.admin.revokeBtn}
                </Button>
              )}
              {!user.isAdmin && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={savingId === user.id}
                  onClick={() => deleteUser(user)}
                >
                  {t.admin.deleteBtn}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
