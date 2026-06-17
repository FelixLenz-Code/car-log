"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  confirmText = "Diesen Eintrag wirklich löschen?",
  label,
}: {
  action: () => Promise<unknown>;
  confirmText?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size={label ? "sm" : "icon"}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        startTransition(() => {
          void action();
        });
      }}
      className="text-muted-foreground hover:text-destructive"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
      {label}
    </Button>
  );
}
