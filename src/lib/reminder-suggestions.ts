import "server-only";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export type ReminderSuggestion = {
  type: "INSPECTION" | "SERVICE";
  title: string;
  dueDate: string; // yyyy-mm-dd
  recurrenceMonths: number;
  reason: string;
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const monthsBetween = (a: Date, b: Date) =>
  (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

/** Advance a (possibly past) due date forward to the next upcoming occurrence. */
function nextOccurrence(due: Date, recurrenceMonths: number, now: Date): Date {
  let next = new Date(due);
  while (next < now) next = addMonths(next, recurrenceMonths);
  return next;
}

/**
 * Estimate due dates from history: HU/AU from the last inspection (+24 months)
 * and the next service from the average interval between past services. Skips a
 * suggestion when an active reminder of that type already exists.
 */
export async function suggestReminders(vehicleId: string): Promise<ReminderSuggestion[]> {
  const now = new Date();
  const [inspections, services, existing] = await Promise.all([
    db.repairEntry.findMany({
      where: { vehicleId, category: "INSPECTION" },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    db.repairEntry.findMany({
      where: { vehicleId, category: "SERVICE" },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    db.reminder.findMany({ where: { vehicleId, active: true }, select: { type: true } }),
  ]);
  const have = new Set(existing.map((e) => e.type));
  const out: ReminderSuggestion[] = [];

  if (inspections.length && !have.has("INSPECTION")) {
    const last = inspections[inspections.length - 1].date;
    const due = nextOccurrence(addMonths(last, 24), 24, now);
    out.push({
      type: "INSPECTION",
      title: "HU/AU (TÜV)",
      dueDate: isoDay(due),
      recurrenceMonths: 24,
      reason: `Letzte HU/AU am ${formatDate(last)} + 24 Monate`,
    });
  }

  if (services.length && !have.has("SERVICE")) {
    const last = services[services.length - 1].date;
    let interval = 12;
    let reason = `Letzte Wartung am ${formatDate(last)} + 12 Monate`;
    if (services.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < services.length; i++) {
        gaps.push(monthsBetween(services[i - 1].date, services[i].date));
      }
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      interval = Math.min(60, Math.max(3, Math.round(avg)));
      reason = `Ø-Intervall ~${interval} Monate aus ${services.length} Wartungen`;
    }
    const due = nextOccurrence(addMonths(last, interval), interval, now);
    out.push({
      type: "SERVICE",
      title: "Wartung / Inspektion",
      dueDate: isoDay(due),
      recurrenceMonths: interval,
      reason,
    });
  }

  return out;
}
