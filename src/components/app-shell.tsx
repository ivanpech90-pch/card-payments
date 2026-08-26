import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, LayoutDashboard, LogOut, Receipt, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { PinLockScreen } from "@/components/pin-lock-screen";
import { useIdleLock } from "@/hooks/use-idle-lock";

import {
  isPinEnabled,
  isUnlocked,
  lockApp,
} from "@/lib/security";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cards", label: "Tarjetas", icon: CreditCard },
  { to: "/payments", label: "Pagos", icon: Receipt },
] as const;

export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [locked, setLocked] = useState(false);
  useIdleLock(5 * 60 * 1000, () => {
    if (!isPinEnabled()) return;
  
    lockApp();
    setLocked(true);
  });
  useEffect(() => {
    if (!isPinEnabled()) return;
  
    if (!isUnlocked()) {
      setLocked(true);
    }
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    lockApp();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (locked) {
    return (
      <PinLockScreen
        onSuccess={() => setLocked(false)}
      />
    );
  }
  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold">Pagos</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                pathname === item.to && "bg-sidebar-accent text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="justify-start gap-3" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Salir
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-8">
          <h1 className="truncate text-xl font-semibold">{title}</h1>
          <div className="flex items-center gap-2">
            {actions}
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="md:hidden" onClick={signOut} aria-label="Salir">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="fade-up flex-1 space-y-6 p-4 md:p-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 backdrop-blur md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground",
              pathname === item.to && "text-primary",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
