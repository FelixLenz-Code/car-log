"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Fuel,
  Gauge,
  Wrench,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function VehicleTabs({ vehicleId }: { vehicleId: string }) {
  const pathname = usePathname();
  const base = `/vehicles/${vehicleId}`;

  const tabs = [
    { href: base, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: `${base}/fuel`, label: "Tankbuch", icon: Fuel },
    { href: `${base}/mileage`, label: "Kilometer", icon: Gauge },
    { href: `${base}/repairs`, label: "Reparaturen", icon: Wrench },
    { href: `${base}/cleaning`, label: "Pflege", icon: Sparkles },
    { href: `${base}/settings`, label: "Einstellungen", icon: Settings },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card/50 p-1">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
