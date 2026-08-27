import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analyzeReceipt } from "@/lib/ocr.functions";
import { todayISO } from "@/lib/format";
import { uploadReceipt, useSavePayment, type CreditCard, type Payment } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCard[];
  payment?: Payment | null;
};


export function PaymentDialog({ open, onOpenChange, cards, payment }: Props) {
  const save = useSavePayment();
  const analyze = useServerFn(analyzeReceipt);
  const [cardId, setCardId] = useState("");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCardId(payment?.card_id ?? cards[0]?.id ?? "");
    setPaidAt(payment?.paid_at ?? todayISO());
    setAmount(payment ? String(payment.amount) : "");
    setCategory(payment?.category ?? "");
    setNotes(payment?.notes ?? "");
    setFile(null);
  }, [open, payment, cards]);

  async function runOcr() {
    if (!file) {
      toast.error("Primero selecciona una imagen");
      return;
    }
    setAnalyzing(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
        reader.readAsDataURL(file);
      });
      const result = await analyze({ data: { imageDataUrl: dataUrl } });
      if (result.error) {
        toast.error(result.error);
      } else if (result.amount == null && result.date == null) {
        toast.info("No se detectaron datos, captura manualmente");
      } else {
        if (result.amount != null) setAmount(String(result.amount));
        if (result.date) setPaidAt(result.date);
        toast.success("Comprobante analizado");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo analizar");
    } finally {
      setAnalyzing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!cardId) {
      toast.error("Selecciona una tarjeta");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Monto inválido");
      return;
    }
    try {
      let receipt_path = payment?.receipt_path ?? null;
      if (file) receipt_path = await uploadReceipt(file);
      await save.mutateAsync({
        ...(payment?.id ? { id: payment.id } : {}),
        values: {
          card_id: cardId,
          paid_at: paidAt,
          amount: value,
          category: category || null,
          notes: notes.trim().slice(0, 1000) || null,
          receipt_path,
        },
      });
      toast.success(payment ? "Pago actualizado" : "Pago registrado");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
  className="
    h-[100dvh]
    max-h-[100dvh]
    w-full
    max-w-none
    rounded-none
    overflow-y-auto
    sm:h-auto
    sm:max-h-[90vh]
    sm:max-w-md
    sm:rounded-lg
  "
>
        <DialogHeader>
          <DialogTitle>{payment ? "Editar pago" : "Registrar pago"}</DialogTitle>
        </DialogHeader>
        <form
  onSubmit={submit}
  className="space-y-5 pb-24"
>
          <div className="space-y-1.5">
            <Label>Tarjeta</Label>
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una tarjeta" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.last4 ? `••${c.last4}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paid_at">Fecha de pago</Label>
            <div className="flex gap-2">
              <Input id="paid_at" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              <Button type="button" variant="secondary" onClick={() => setPaidAt(todayISO())}>
                Hoy
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
  <Label>Categoría</Label>

  <Select
    value={category}
    onValueChange={setCategory}
  >
    <SelectTrigger>
      <SelectValue placeholder="Selecciona una categoría" />
    </SelectTrigger>

    <SelectContent>
      {CATEGORIES.map((item) => (
        <SelectItem
          key={item.value}
          value={item.value}
        >
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Monto pagado</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt">Comprobante</Label>
            <Input
  id="receipt"
  type="file"
  accept="image/*"
  capture="environment"
  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
/>
{file && (
  <div className="overflow-hidden rounded-lg border">
    <img
      src={URL.createObjectURL(file)}
      alt="Comprobante"
      className="max-h-64 w-full object-contain"
    />
  </div>
)}

{file && (
  <Button
    type="button"
    variant="destructive"
    size="sm"
    onClick={() => setFile(null)}
  >
    Eliminar imagen
  </Button>
)}

            <Button type="button" variant="outline" className="w-full" onClick={runOcr} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analizar comprobante
            </Button>
          </div>

          <div className="sticky bottom-0 bg-background pt-3">
  <Button
    type="submit"
    className="h-12 w-full text-base font-semibold"
  >
    Guardar pago
  </Button>
</div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
