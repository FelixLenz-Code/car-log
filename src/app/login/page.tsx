import { Car } from "lucide-react";
import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Car className="size-7" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Kilomondo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Melde dich an, um deine Fahrzeuge zu verwalten.
          </p>
        </div>
        <Card className="glass">
          <CardHeader className="pb-2">
            <h2 className="font-display text-lg font-medium">Anmeldung</h2>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
