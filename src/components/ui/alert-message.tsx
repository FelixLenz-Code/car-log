import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AlertMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;
  const isError = !!error;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        isError
          ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
          : "border-accent/40 bg-accent/10 text-accent"
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
      )}
      <span>{error ?? success}</span>
    </div>
  );
}
