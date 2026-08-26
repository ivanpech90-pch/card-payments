import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analyzeReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl?.startsWith("data:image/")) throw new Error("Imagen inválida");
    if (input.imageDataUrl.length > 8_000_000) throw new Error("Imagen demasiado grande");
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { amount: null as number | null, date: null as string | null, error: "IA no disponible" };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              'Extrae datos de comprobantes de pago. Responde SOLO JSON: {"amount": number|null, "date": "YYYY-MM-DD"|null}. Sin texto extra.',
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Detecta el monto pagado y la fecha del pago." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      return {
        amount: null as number | null,
        date: null as string | null,
        error: res.status === 429 ? "Límite de uso alcanzado, intenta más tarde" : "No se pudo analizar",
      };
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { amount: null as number | null, date: null as string | null, error: null as string | null };
    try {
      const parsed = JSON.parse(match[0]) as { amount?: unknown; date?: unknown };
      const amount = typeof parsed.amount === "number" ? parsed.amount : null;
      const date = typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null;
      return { amount, date, error: null as string | null };
    } catch {
      return { amount: null as number | null, date: null as string | null, error: null as string | null };
    }
  });
