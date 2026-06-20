"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, LogOut, Shield, UserCog } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

export function AppNav({
  user,
}: {
  user: { name: string; role: "ADMIN" | "USER" };
}) {
  const pathname = usePathname();
  const isGarage = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Car className="size-5" />
          </span>
          <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
            Car Log
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className={cn(
              "rounded-md px-3 py-2 transition-colors hover:bg-secondary/60",
              isGarage && "bg-secondary/60 text-foreground"
            )}
          >
            Garage
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/admin/users"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors hover:bg-secondary/60",
                pathname.startsWith("/admin") && "bg-secondary/60 text-foreground"
              )}
            >
              <Shield className="size-4" /> Admin
            </Link>
          )}
          <Link
            href="/account"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors hover:bg-secondary/60",
              pathname.startsWith("/account") && "bg-secondary/60 text-foreground"
            )}
            title={user.name}
          >
            <UserCog className="size-4" />
            <span className="hidden sm:inline">{user.name}</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
