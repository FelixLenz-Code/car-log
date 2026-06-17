import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { CreateUserForm } from "@/components/forms/account-forms";
import { UserActions } from "@/components/admin/user-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Benutzerverwaltung
        </h1>
        <p className="mt-1 text-muted-foreground">
          Lege Konten an und verwalte Zugänge.
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Neuen Benutzer anlegen</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Benutzer ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                    {u.role === "ADMIN" ? "Admin" : "Benutzer"}
                  </Badge>
                  {!u.isActive && <Badge variant="outline">Deaktiviert</Badge>}
                  {u.id === admin.id && <Badge variant="accent">Du</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {u.email} · {u._count.vehicles} Fahrzeug(e) · seit{" "}
                  {formatDate(u.createdAt)}
                </p>
              </div>
              <UserActions
                userId={u.id}
                isActive={u.isActive}
                isSelf={u.id === admin.id}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
