import Tesseract from "tesseract.js";

type ReceiptData = {
  text: string;
  amount: number | null;
  date: string | null;
};

const amountLabels = ["TOTAL PAGADO", "TOTAL MXN", "TOTAL", "IMPORTE"];

export async function preprocessImage(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loadedImage = new Image();
      loadedImage.onload = () => resolve(loadedImage);
      loadedImage.onerror = () => reject(new Error("No se pudo cargar la imagen"));
      loadedImage.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth * 2;
    canvas.height = image.naturalHeight * 2;
    const context = canvas.getContext("2d");

    if (!context) throw new Error("No se pudo procesar la imagen");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const contrast = 1.5;

    for (let index = 0; index < imageData.data.length; index += 4) {
      const r = imageData.data[index] ?? 0;
const g = imageData.data[index + 1] ?? 0;
const b = imageData.data[index + 2] ?? 0;

const gray =
  r * 0.299 +
  g * 0.587 +
  b * 0.114;
    }

    context.putImageData(imageData, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo generar la imagen procesada"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function parseAmount(value: string): number | null {
  const normalized = value.replace(/\s/g, "");

  const amount = Number(
    normalized
      .replace(/\$/g, "")
      .replace(/,/g, "")
  );

  if (!Number.isFinite(amount)) return null;

  // descartar códigos de barras, SKU, etc.
  if (amount <= 0 || amount > 100000) return null;

  return amount;
}
function toIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}
function extractAmount(text: string): number | null {
  const matches = [...text.matchAll(
    /\b(TOTAL\s+PAGADO|TOTAL\s+MXN|TOTAL|IMPORTE)\b[^\d$]{0,12}(\$?\s*[\d.,]+)/gi
  )]
    .map((match) => {
      const label = match[1] ?? "";
      const value = match[2] ?? "";

      return {
        label: label.replace(/\s+/g, " ").toUpperCase(),
        amount: parseAmount(value),
      };
    })
    .filter(
      (
        match
      ): match is { label: string; amount: number } =>
        match.amount !== null
    );

  matches.sort(
    (a, b) =>
      amountLabels.indexOf(a.label) -
      amountLabels.indexOf(b.label)
  );

  return matches[0]?.amount ?? null;
}

function extractDate(text: string): string | null {
  const matches = [
    ...text.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g),
  ];

  for (const match of matches) {
    const day = Number(match[1]);
    const month = Number(match[2]);

    let year = Number(match[3]);

    if (year < 100) {
      year += 2000;
    }

    const date = toIsoDate(year, month, day);

    if (date) {
      return date;
    }
  }

  // Fecha compacta encontrada en muchos tickets
  // Ejemplo: TSM270826175754

  const compactMatch = text.match(
    /\b[A-Z]{0,5}(\d{2})(\d{2})(\d{2})\d{4,8}\b/
  );

  if (compactMatch) {
    const day = Number(compactMatch[1]);
    const month = Number(compactMatch[2]);
    const year = 2000 + Number(compactMatch[3]);

    return toIsoDate(year, month, day);
  }

  return null;
}
export async function extractReceiptData(file: File): Promise<ReceiptData> {
  console.log("OCR original:", file.size);
  const processedBlob = await preprocessImage(file);

  const originalResult = await Tesseract.recognize(
    file,
    "spa"
  );
  
  const processedResult = await Tesseract.recognize(
    processedBlob,
    "spa"
  );
  
  const text =
    originalResult.data.text +
    "\n" +
    processedResult.data.text;
    console.log("========== OCR ==========");
    console.log(text);
    console.log("=========================");

const amount = extractAmount(text);
const date = extractDate(text);

console.log({
  amount: extractAmount(text),
  date: extractDate(text),
});

return {
  text,
  amount,
  date,
};
}
