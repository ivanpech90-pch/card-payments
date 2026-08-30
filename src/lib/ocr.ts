import Tesseract from "tesseract.js";

type ReceiptData = {
  text: string;
  amount: number | null;
  date: string | null;
};

type AmountCandidate = {
  amount: number;
  score: number;
  index: number;
};

const MAX_IMAGE_WIDTH = 1200;
const amountLabels = ["TOTAL PAGADO", "TOTAL MXN", "TOTAL", "IMPORTE"];
const amountPattern = String.raw`(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{2})?`;

let workerPromise: Promise<Tesseract.Worker> | null = null;

function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker("spa", Tesseract.OEM.LSTM_ONLY)
      .then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          preserve_interword_spaces: "1",
        });
        return worker;
      })
      .catch((error) => {
        workerPromise = null;
        throw error;
      });
  }

  return workerPromise;
}

export async function preprocessImage(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loadedImage = new Image();
      loadedImage.onload = () => resolve(loadedImage);
      loadedImage.onerror = () => reject(new Error("No se pudo cargar la imagen"));
      loadedImage.src = imageUrl;
    });

    const scale = image.naturalWidth > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / image.naturalWidth : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) throw new Error("No se pudo procesar la imagen");

    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);

    for (let index = 0; index < imageData.data.length; index += 4) {
      const red = imageData.data[index] ?? 0;
      const green = imageData.data[index + 1] ?? 0;
      const blue = imageData.data[index + 2] ?? 0;
      const gray = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);

      imageData.data[index] = gray;
      imageData.data[index + 1] = gray;
      imageData.data[index + 2] = gray;
    }

    context.putImageData(imageData, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo generar la imagen procesada"));
      }, "image/jpeg", 0.8);
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function parseAmount(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(/\$/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  let numberValue = normalized;

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? /\./g : /,/g;
    numberValue = normalized.replace(thousandsSeparator, "").replace(decimalSeparator, ".");
  } else if (lastComma !== -1) {
    numberValue = /,\d{2}$/.test(normalized) ? normalized.replace(",", ".") : normalized.replace(/,/g, "");
  } else if (/\.\d{3}$/.test(normalized)) {
    numberValue = normalized.replace(/\./g, "");
  }

  const amount = Number(numberValue.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) && amount > 0 && amount <= 100000 ? amount : null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function extractAmount(text: string): number | null {
  const candidates: AmountCandidate[] = [];
  const labelPattern = /\b(TOTAL\s+PAGADO|TOTAL\s+MXN|TOTAL|IMPORTE)\b/gi;

  for (const match of text.matchAll(labelPattern)) {
    const index = match.index ?? 0;
    const label = (match[1] ?? "").replace(/\s+/g, " ").toUpperCase();
    const nearbyText = text.slice(index + match[0].length, index + match[0].length + 60);
    const valueMatch = nearbyText.match(new RegExp(`(?:\\$\\s*|MXN\\s*)?(${amountPattern})(?:\\s*MXN)?`, "i"));
    const amount = valueMatch ? parseAmount(valueMatch[1] ?? "") : null;

    if (amount == null) continue;

    const currencyBonus = /\$|\bMXN\b/i.test(valueMatch?.[0] ?? "") ? 25 : 0;
    const labelScore = 100 - Math.max(0, amountLabels.indexOf(label)) * 10;
    candidates.push({ amount, score: labelScore + currencyBonus, index });
  }

  const currencyPattern = new RegExp(`(?:\\$\\s*(${amountPattern})|(${amountPattern})\\s*MXN)`, "gi");
  for (const match of text.matchAll(currencyPattern)) {
    const amount = parseAmount(match[1] ?? match[2] ?? "");
    if (amount != null) candidates.push({ amount, score: 30, index: match.index ?? 0 });
  }

  candidates.sort((a, b) => b.score - a.score || b.index - a.index);
  return candidates[0]?.amount ?? null;
}

function extractDate(text: string): string | null {
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

  const matches = [...text.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/g)];
  for (const match of matches) {
    const yearValue = Number(match[3]);
    const year = yearValue < 100 ? yearValue + 2000 : yearValue;
    const date = toIsoDate(year, Number(match[2]), Number(match[1]));
    if (date) return date;
  }

  const compactMatch = text.match(/\b[A-Z]{0,5}(\d{2})(\d{2})(\d{2})\d{4,8}\b/);
  if (compactMatch) return toIsoDate(2000 + Number(compactMatch[3]), Number(compactMatch[2]), Number(compactMatch[1]));

  return null;
}

export async function extractReceiptData(file: File): Promise<ReceiptData> {
  const start = performance.now();
  console.log("OCR start");
  const processedBlob = await preprocessImage(file);
  console.log("Image resized");

  const worker = await getWorker();
  const result = await worker.recognize(processedBlob);
  console.log("OCR finished");
  console.log("Elapsed ms", Math.round(performance.now() - start));

  const text = result.data.text;
  return {
    text,
    amount: extractAmount(text),
    date: extractDate(text),
  };
}
