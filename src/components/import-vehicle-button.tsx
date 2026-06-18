"use client";

import { useActionState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { importVehicleAction } from "@/actions/vehicles";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImportVehicleButton() {
  const [state, action, pending] = useActionState(importVehicleAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <form ref={formRef} action={action}>
        <input
          ref={inputRef}
          type="file"
          name="archive"
          accept=".zip,application/zip"
          className="hidden"
          onChange={() => formRef.current?.requestSubmit()}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className={cn(buttonVariants({ variant: "outline" }))}
          title="Ein zuvor exportiertes Fahrzeug-ZIP importieren"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span className="hidden sm:inline">{pending ? "Importiere …" : "Importieren"}</span>
        </button>
      </form>
      {state?.error && (
        <p className="max-w-[15rem] text-right text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
