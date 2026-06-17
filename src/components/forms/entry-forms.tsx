"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { AlertMessage } from "@/components/ui/alert-message";

type State = { error?: string; success?: string };
type Action = (prev: State, formData: FormData) => Promise<State>;

const today = () => new Date().toISOString().slice(0, 10);

function useResettingAction(action: Action) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);
  return { state, formAction, ref };
}

const fuelLabels = { L: "Liter", kWh: "kWh" } as const;

export function FuelForm({ action, unit }: { action: Action; unit: "L" | "kWh" }) {
  const { state, formAction, ref } = useResettingAction(action);
  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <AlertMessage error={state.error} success={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Datum *</Label>
          <Input id="date" name="date" type="date" required defaultValue={today()} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="odometer">Kilometerstand *</Label>
          <Input id="odometer" name="odometer" type="number" min={0} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Menge ({fuelLabels[unit]}) *</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min={0} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pricePerUnit">Preis / {unit}</Label>
          <Input id="pricePerUnit" name="pricePerUnit" type="number" step="0.001" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalCost">Gesamtpreis (€) *</Label>
          <Input id="totalCost" name="totalCost" type="number" step="0.01" min={0} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="station">Tankstelle</Label>
          <Input id="station" name="station" placeholder="z. B. Aral" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isFullTank" defaultChecked className="size-4 accent-[hsl(38_92%_55%)]" />
        Volltankung (für Verbrauchsberechnung)
      </label>
      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <SubmitButton>Tankung hinzufügen</SubmitButton>
    </form>
  );
}

export function OdometerForm({ action }: { action: Action }) {
  const { state, formAction, ref } = useResettingAction(action);
  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <AlertMessage error={state.error} success={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Datum *</Label>
          <Input id="date" name="date" type="date" required defaultValue={today()} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="odometer">Kilometerstand *</Label>
          <Input id="odometer" name="odometer" type="number" min={0} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Notiz</Label>
        <Input id="note" name="note" />
      </div>
      <SubmitButton>Eintrag hinzufügen</SubmitButton>
    </form>
  );
}

export function RepairForm({ action }: { action: Action }) {
  const { state, formAction, ref } = useResettingAction(action);
  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <AlertMessage error={state.error} success={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Datum *</Label>
          <Input id="date" name="date" type="date" required defaultValue={today()} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Kategorie</Label>
          <Select id="category" name="category" defaultValue="REPAIR">
            <option value="REPAIR">Reparatur</option>
            <option value="SERVICE">Inspektion / Service</option>
            <option value="INSPECTION">HU / AU (TÜV)</option>
            <option value="TIRES">Reifen</option>
            <option value="OTHER">Sonstiges</option>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Titel *</Label>
          <Input id="title" name="title" required placeholder="z. B. Bremsbeläge vorne" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Kosten (€)</Label>
          <Input id="cost" name="cost" type="number" step="0.01" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="odometer">Kilometerstand</Label>
          <Input id="odometer" name="odometer" type="number" min={0} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="workshop">Werkstatt</Label>
          <Input id="workshop" name="workshop" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" />
      </div>
      <SubmitButton>Eintrag hinzufügen</SubmitButton>
    </form>
  );
}

export function CleaningForm({ action }: { action: Action }) {
  const { state, formAction, ref } = useResettingAction(action);
  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <AlertMessage error={state.error} success={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Datum *</Label>
          <Input id="date" name="date" type="date" required defaultValue={today()} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Art</Label>
          <Select id="type" name="type" defaultValue="FULL">
            <option value="FULL">Komplett</option>
            <option value="EXTERIOR">Außen</option>
            <option value="INTERIOR">Innen</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Kosten (€)</Label>
          <Input id="cost" name="cost" type="number" step="0.01" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="odometer">Kilometerstand</Label>
          <Input id="odometer" name="odometer" type="number" min={0} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="products">Verwendete Produkte</Label>
          <Input id="products" name="products" placeholder="z. B. Hartwachs, Felgenreiniger" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <SubmitButton>Eintrag hinzufügen</SubmitButton>
    </form>
  );
}
