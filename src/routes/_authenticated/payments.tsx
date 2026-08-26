import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PaymentDialog } from "@/components/payment-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { receiptUrl, useCards, useDeletePayment, usePayments, type Payment } from "@/lib/data";
import { currency, shortDate } from "@/lib/format";
import { categoryLabel } from "@/lib/categories";
const CATEGORY_LABELS: Record<string, string> = {
  food: "🍔 Comida",
  groceries: "🛒 Despensa",
  supermarket: "🏪 Supermercado",
  fuel: "⛽ Gasolina",
  utilities: "⚡ Servicios",
  internet: "📶 Internet",
  streaming: "📺 Streaming",
  chatgpt: "🤖 ChatGPT",
  gym: "🏋️ Gimnasio",
  health: "🏥 Salud",
  education: "📚 Educación",
  other: "📦 Otro",
};

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Historial de pagos | Pagos" },
      { name: "description", content: "Consulta, filtra y exporta el historial de pagos de tus tarjetas de crédito." },
      { property: "og:title", content: "Historial de pagos" },
      { property: "og:description", content: "Filtra por tarjeta y fecha, y exporta a Excel o CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: cards = [] } = useCards();
  const { data: payments = [], isLoading } = usePayments();
  const remove = useDeletePayment();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);
  const [query, setQuery] = useState("");
  const [cardFilter, setCardFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const cardName = (id: string) => cards.find((c) => c.id === id)?.name ?? "—";

  const rows = useMemo(
    () =>
      payments.filter((p) => {
        if (cardFilter !== "all" && p.card_id !== cardFilter) return false;
        if (from && p.paid_at < from) return false;
        if (to && p.paid_at > to) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          cardName(p.card_id).toLowerCase().includes(q) ||
          (p.notes ?? "").toLowerCase().includes(q) ||
          String(p.amount).includes(q)
        );
      }),
    [payments, cardFilter, from, to, query, cards],
  );

  const total = rows.reduce((s, p) => s + Number(p.amount), 0);

  async function exportFile(type: "xlsx" | "csv") {
    if (rows.length === 0) {
      toast.error("No hay pagos para exportar");
      return;
    }
    const XLSX = await import("xlsx");
    const data = rows.map((p) => ({
      Fecha: p.paid_at,
      Tarjeta: cardName(p.card_id),
      Categoria: categoryLabel(p.category),
      Monto: Number(p.amount),
      Notas: p.notes ?? "",
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Pagos");
    XLSX.writeFile(book, `pagos.${type}`, { bookType: type });
    toast.success("Exportación lista");
  }

  async function openReceipt(path: string) {
    try {
      window.open(await receiptUrl(path), "_blank", "noopener");
    } catch {
      toast.error("No se pudo abrir el comprobante");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Pago eliminado");
    } catch {
      toast.error("No se pudo eliminar");
    }
    setDeleting(null);
  }

  return (
    <AppShell
      title="Pagos"
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          disabled={cards.length === 0}
        >
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      }
    >
      <div className="surface grid gap-3 rounded-xl p-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por tarjeta, nota o monto" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={cardFilter} onValueChange={setCardFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Tarjeta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las tarjetas</SelectItem>
            {cards.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} pagos · Total <span className="font-medium text-foreground">{currency(total)}</span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportFile("xlsx")}>
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportFile("csv")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="surface overflow-x-auto rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
<TableHead>Tarjeta</TableHead>
<TableHead>Categoría</TableHead>
<TableHead className="text-right">Monto</TableHead>
<TableHead className="hidden md:table-cell">Notas</TableHead>
<TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sin pagos registrados.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{shortDate(p.paid_at)}</TableCell>
                  <TableCell>{cardName(p.card_id)}</TableCell>
                  <TableCell>
  {p.category
    ? CATEGORY_LABELS[p.category] ?? p.category
    : "—"}
</TableCell>
                  <TableCell className="text-right font-medium">{currency(Number(p.amount))}</TableCell>
                  <TableCell className="hidden max-w-[240px] truncate md:table-cell">{p.notes}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {p.receipt_path && (
                        <Button variant="ghost" size="icon" aria-label="Ver comprobante" onClick={() => openReceipt(p.receipt_path!)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => setDeleting(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaymentDialog open={open} onOpenChange={setOpen} cards={cards} payment={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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
