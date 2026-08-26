import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { CardDialog } from "@/components/card-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCards, useDeleteCard, usePayments, type CreditCard } from "@/lib/data";
import { currency, nextDateForDay, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({
    meta: [
      { title: "Mis tarjetas de crédito | Pagos" },
      { name: "description", content: "Administra tus tarjetas: banco, límite, día de corte y fecha límite de pago." },
      { property: "og:title", content: "Mis tarjetas de crédito" },
      { property: "og:description", content: "Administra tus tarjetas de crédito y sus fechas clave." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const { data: cards = [], isLoading } = useCards();
  const { data: payments = [] } = usePayments();
  const remove = useDeleteCard();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [deleting, setDeleting] = useState<CreditCard | null>(null);

  function newCard() {
    setEditing(null);
    setOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Tarjeta eliminada");
    } catch {
      toast.error("No se pudo eliminar");
    }
    setDeleting(null);
  }

  return (
    <AppShell
      title="Tarjetas"
      actions={
        <Button size="sm" onClick={newCard}>
          <Plus className="h-4 w-4" /> Nueva
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : cards.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Aún no tienes tarjetas registradas.</p>
          <Button onClick={newCard}>
            <Plus className="h-4 w-4" /> Agregar tarjeta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const paid = payments
              .filter((p) => p.card_id === card.id)
              .reduce((s, p) => s + Number(p.amount), 0);
            return (
              <div key={card.id} className="space-y-3">
                <div
                  className="relative flex h-44 flex-col justify-between rounded-2xl p-5 text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}99)` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm/none opacity-80">{card.bank || "Banco"}</p>
                      <p className="mt-1 text-lg font-semibold">{card.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        aria-label="Editar"
                        className="rounded-md bg-white/20 p-1.5 hover:bg-white/30"
                        onClick={() => {
                          setEditing(card);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Eliminar"
                        className="rounded-md bg-white/20 p-1.5 hover:bg-white/30"
                        onClick={() => setDeleting(card)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-lg tracking-[0.3em]">•••• {card.last4 || "0000"}</p>
                    <div className="mt-2 flex justify-between text-xs opacity-90">
                      <span>Corte: {shortDate(nextDateForDay(card.statement_day).toISOString().slice(0, 10))}</span>
                      <span>Pago: {shortDate(nextDateForDay(card.due_day).toISOString().slice(0, 10))}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between px-1 text-sm">
                  <span className="text-muted-foreground">Límite {currency(Number(card.credit_limit))}</span>
                  <span className="font-medium">Pagado {currency(paid)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CardDialog open={open} onOpenChange={setOpen} card={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarjeta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también los pagos asociados a {deleting?.name}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
