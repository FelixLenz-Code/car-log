"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction } from "@/actions/auth";
import { createUserAction } from "@/actions/users";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { AlertMessage } from "@/components/ui/alert-message";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <AlertMessage error={state.error} success={state.success} />
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">Neues Passwort</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      <SubmitButton>Passwort ändern</SubmitButton>
    </form>
  );
}

export function CreateUserForm() {
  const [state, formAction] = useActionState(createUserAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <AlertMessage error={state.error} success={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Initial-Passwort</Label>
          <Input id="password" name="password" type="text" minLength={8} required placeholder="min. 8 Zeichen" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rolle</Label>
          <Select id="role" name="role" defaultValue="USER">
            <option value="USER">Benutzer</option>
            <option value="ADMIN">Administrator</option>
          </Select>
        </div>
      </div>
      <SubmitButton>Benutzer anlegen</SubmitButton>
    </form>
  );
}
