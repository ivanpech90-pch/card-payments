import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveCard, type CreditCard } from "@/lib/data";

const DEFAULT_COLOR = "#2563eb";
const COLORS = [DEFAULT_COLOR, "#7c3aed", "#0f766e", "#db2777", "#ea580c", "#0f172a"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard | null;
};

export function CardDialog({ open, onOpenChange, card }: Props) {
  const save = useSaveCard();
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [last4, setLast4] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [limit, setLimit] = useState("");
  const [statementDay, setStatementDay] = useState("1");
  const [dueDay, setDueDay] = useState("15");

  useEffect(() => {
    if (!open) return;
    setName(card?.name ?? "");
    setBank(card?.bank ?? "");
    setLast4(card?.last4 ?? "");
    setColor(card?.color ?? DEFAULT_COLOR);
    setLimit(card ? String(card.credit_limit) : "");
    setStatementDay(String(card?.statement_day ?? 1));
    setDueDay(String(card?.due_day ?? 15));
  }, [open, card]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Escribe un nombre");
      return;
    }
    const day = (v: string) => Math.min(31, Math.max(1, Number(v) || 1));
    try {
      await save.mutateAsync({
        ...(card?.id ? { id: card.id } : {}),
        values: {
          name: name.trim(),
          bank: bank.trim(),
          last4: last4.replace(/\D/g, "").slice(-4),
          color,
          credit_limit: Number(limit) || 0,
          statement_day: day(statementDay),
          due_day: day(dueDay),
        },
      });
      toast.success(card ? "Tarjeta actualizada" : "Tarjeta creada");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{card ? "Editar tarjeta" : "Nueva tarjeta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Oro Platino" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bank">Banco</Label>
              <Input id="bank" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="BBVA" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last4">Últimos 4</Label>
              <Input id="last4" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="limit">Límite de crédito</Label>
            <Input id="limit" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="statement">Día de corte</Label>
              <Input id="statement" inputMode="numeric" value={statementDay} onChange={(e) => setStatementDay(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due">Día límite de pago</Label>
              <Input id="due" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
