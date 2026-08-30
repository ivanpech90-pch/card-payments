import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extractReceiptData } from "@/lib/ocr";
import { todayISO } from "@/lib/format";
import { receiptUrl, uploadReceipt, useSavePayment, type CreditCard, type Payment } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCard[];
  payment?: Payment | null;
};

type Step = "selection" | "file-picker" | "preview" | "ocr-review" | "correction" | "complete" | "form";

export function PaymentDialog({ open, onOpenChange, cards, payment }: Props) {
  const save = useSavePayment();
  const [cardId, setCardId] = useState("");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>("selection");
  const [ocrResult, setOcrResult] = useState<{ amount: number | null; date: string | null }>({ amount: null, date: null });
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(payment ? "form" : "selection");
    setOcrResult({ amount: null, date: null });
    setCardId(payment?.card_id ?? cards[0]?.id ?? "");
    setPaidAt(payment?.paid_at ?? todayISO());
    setAmount(payment ? String(payment.amount) : "");
    setCategory(payment?.category ?? "");
    setNotes(payment?.notes ?? "");
    setFile(null);

    let cancelled = false;
    setExistingReceiptUrl(null);
    if (payment?.receipt_path && !payment.receipt_path.toLowerCase().endsWith(".pdf")) {
      receiptUrl(payment.receipt_path)
        .then((url) => {
          if (!cancelled) setExistingReceiptUrl(url);
        })
        .catch(() => {
          if (!cancelled) setExistingReceiptUrl(null);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [open, payment, cards]);

  function handleFileSelected(selectedFile: File | null, nextStep: Step) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setExistingReceiptUrl(null);
    setOcrResult({ amount: null, date: null });
    setStep(nextStep);
  }

  async function runOcr() {
    if (!file) {
      toast.error("Primero selecciona una imagen");
      return;
    }
    if (file.type === "application/pdf") {
      toast.info("El análisis automático aún no está disponible para PDF. Puedes adjuntar el archivo y guardar el pago normalmente.");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await extractReceiptData(file);
      if (result.amount != null) setAmount(String(result.amount));
      if (result.date) setPaidAt(result.date);
      setOcrResult({ amount: result.amount, date: result.date });
      setStep("ocr-review");
      if (result.amount != null || result.date) {
        toast.success("Comprobante analizado");
      } else {
        toast.info("No se detectaron datos");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo analizar");
    } finally {
      setAnalyzing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const value = Number(amount);
    if (!cardId) {
      toast.error("Selecciona una tarjeta");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Monto inválido");
      return;
    }
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  const existingReceiptIsPdf = payment?.receipt_path?.toLowerCase().endsWith(".pdf") ?? false;
  const existingReceiptName = payment?.receipt_path?.split("/").pop() ?? "comprobante.pdf";

  async function openExistingReceipt() {
    if (!payment?.receipt_path) return;
    try {
      const url = existingReceiptUrl ?? (await receiptUrl(payment.receipt_path));
      if (!existingReceiptUrl) setExistingReceiptUrl(url);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir el comprobante");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen && saving) return;
      onOpenChange(nextOpen);
    }}>
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
        {!payment && step === "selection" ? (
          <div className="space-y-6">
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

            <div className="space-y-3">
              <Button type="button" size="lg" className="w-full" onClick={() => setStep("file-picker")} disabled={!cardId}>
                Subir comprobante y detectar datos
              </Button>
              <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => setStep("form")}>
                Capturar manualmente
              </Button>
            </div>
          </div>
        ) : step === "file-picker" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Seleccionar comprobante</h2>
              <p className="text-sm text-muted-foreground">Elige cómo quieres adjuntar tu comprobante.</p>
            </div>
            <div className="grid gap-3">
              <Button type="button" size="lg" className="w-full" onClick={() => cameraInputRef.current?.click()}>
                Tomar foto
              </Button>
              <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => galleryInputRef.current?.click()}>
                Elegir de galería
              </Button>
              <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => pdfInputRef.current?.click()}>
                Seleccionar PDF
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null, "preview")}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null, "preview")}
            />
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null, "preview")}
            />
          </div>
        ) : step === "preview" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Comprobante seleccionado</h2>
              {file?.type === "application/pdf" ? (
                <p className="mt-2 text-sm text-muted-foreground">PDF seleccionado: {file.name}</p>
              ) : file ? (
                <img src={URL.createObjectURL(file)} alt="Vista previa del comprobante" className="mt-3 max-h-64 w-full rounded-lg border object-contain" />
              ) : null}
            </div>
            {file?.type === "application/pdf" && (
              <p className="text-sm text-muted-foreground">
                El análisis automático aún no está disponible para PDF. Puedes adjuntar el archivo y guardar el pago normalmente.
              </p>
            )}
            <div className="grid gap-3">
              {file?.type === "application/pdf" ? (
                <Button type="button" size="lg" className="w-full" onClick={() => setStep("form")}>
                  PDF detectado · OCR no disponible
                </Button>
              ) : (
                <Button type="button" size="lg" className="w-full" onClick={runOcr} disabled={analyzing || !file}>
                  {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  {analyzing ? "Analizando comprobante..." : "Analizar comprobante"}
                </Button>
              )}
              <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => setStep("file-picker")} disabled={analyzing}>
                Cambiar archivo
              </Button>
            </div>
          </div>
        ) : step === "ocr-review" ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Monto detectado</p>
                <p className="text-xl font-semibold">{ocrResult.amount != null ? `$${ocrResult.amount.toFixed(2)}` : "No detectado"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha detectada</p>
                <p className="text-xl font-semibold">{ocrResult.date ? ocrResult.date.split("-").reverse().join("/") : "No detectada"}</p>
              </div>
            </div>
            <div className="grid gap-3">
              <Button type="button" size="lg" className="w-full" onClick={() => setStep("complete")}>
                Correcto, continuar
              </Button>
              <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => setStep("correction")}>
                Corregir datos
              </Button>
            </div>
          </div>
        ) : step === "complete" ? (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
              <h2 className="text-lg font-semibold">Completar información</h2>
              <div className="grid gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Tarjeta</p>
                  <p className="font-medium">
                    {cards.find((card) => card.id === cardId)?.bank || cards.find((card) => card.id === cardId)?.name || "Tarjeta"}
                    {cards.find((card) => card.id === cardId)?.last4 ? ` ••${cards.find((card) => card.id === cardId)?.last4}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">{paidAt ? paidAt.split("-").reverse().join("/") : "No capturada"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-medium">{amount ? `$${Number(amount).toFixed(2)}` : "No capturado"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comprobante</p>
                  <p className="truncate font-medium">{file?.name ?? "Adjunto"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ocr-notes">Notas (opcional)</Label>
              <Textarea id="ocr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
            </div>

            <Button type="submit" size="lg" className="h-12 w-full" disabled={!category || saving}>
              {saving && <Loader2 className="h-5 w-5 animate-spin" />}
              {saving ? "Guardando pago..." : "Guardar pago"}
            </Button>
          </form>
        ) : step === "correction" ? (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("complete");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ocr-correction-amount">Monto</Label>
              <Input id="ocr-correction-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ocr-correction-date">Fecha</Label>
              <Input id="ocr-correction-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
            <Button type="submit" size="lg" className="w-full">
              Guardar corrección
            </Button>
          </form>
        ) : (
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
            <Label>Adjuntar comprobante (opcional)</Label>
            {payment?.receipt_path && !file && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Comprobante actual</p>
                {existingReceiptIsPdf ? (
                  <p className="text-sm text-muted-foreground">📄 {existingReceiptName}</p>
                ) : existingReceiptUrl ? (
                  <img src={existingReceiptUrl} alt="Comprobante actual" className="max-h-48 w-full rounded-lg object-contain" />
                ) : (
                  <p className="text-sm text-muted-foreground">Cargando comprobante...</p>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={openExistingReceipt}>
                    {existingReceiptIsPdf ? "Ver comprobante" : "Ver imagen"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()}>
                    Reemplazar archivo
                  </Button>
                </div>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()}>
                Tomar foto
              </Button>
              <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()}>
                Elegir de galería
              </Button>
              <Button type="button" variant="outline" onClick={() => pdfInputRef.current?.click()}>
                Seleccionar PDF
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null, "form")}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null, "form")}
            />
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null, "form")}
            />
{file && (
  file.type === "application/pdf" ? (
    <p className="text-sm text-muted-foreground">PDF seleccionado: {file.name}</p>
  ) : (
    <div className="overflow-hidden rounded-lg border">
      <img
        src={URL.createObjectURL(file)}
        alt="Comprobante"
        className="max-h-64 w-full object-contain"
      />
    </div>
  )
)}

{file && (
  <Button
    type="button"
    variant="destructive"
    size="sm"
    onClick={() => setFile(null)}
  >
    Cambiar comprobante
  </Button>
)}
          </div>

          <div className="sticky bottom-0 bg-background pt-3">
  <Button
    type="submit"
    className="h-12 w-full text-base font-semibold"
    disabled={saving}
  >
    {saving && <Loader2 className="h-5 w-5 animate-spin" />}
    {saving ? "Guardando pago..." : payment?.id ? "Actualizar pago" : "Guardar pago"}
  </Button>
</div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
