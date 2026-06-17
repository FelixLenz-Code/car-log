"use client";

import { useState, useTransition } from "react";
import { KeyRound, Power, PowerOff, Trash2, Loader2 } from "lucide-react";
import {
  toggleUserActiveAction,
  deleteUserAction,
  resetPasswordAction,
} from "@/actions/users";
import { Button } from "@/components/ui/button";

export function UserActions({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function resetPassword() {
    const pw = window.prompt("Neues Passwort (min. 8 Zeichen):");
    if (!pw) return;
    if (pw.length < 8) {
      setMsg("Passwort zu kurz.");
      return;
    }
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("password", pw);
    startTransition(async () => {
      const res = await resetPasswordAction({}, fd);
      setMsg(res.error ?? res.success ?? null);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {msg && <span className="mr-2 text-xs text-muted-foreground">{msg}</span>}
      <Button
        variant="ghost"
        size="icon"
        title="Passwort zurücksetzen"
        disabled={pending}
        onClick={resetPassword}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
      </Button>
      {!isSelf && (
        <>
          <Button
            variant="ghost"
            size="icon"
            title={isActive ? "Deaktivieren" : "Aktivieren"}
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void toggleUserActiveAction(userId);
              })
            }
          >
            {isActive ? (
              <PowerOff className="size-4" />
            ) : (
              <Power className="size-4 text-accent" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Löschen"
            className="hover:text-destructive"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Benutzer und alle zugehörigen Daten löschen?")) return;
              startTransition(() => {
                void deleteUserAction(userId);
              });
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </>
      )}
    </div>
  );
}
