import type { CreditCard } from "./data";

export const currency = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

export const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Next occurrence of a day-of-month, from today (inclusive). */
export function nextDateForDay(day: number) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const clamp = (y: number, m: number) => Math.min(day, new Date(y, m + 1, 0).getDate());
  let candidate = new Date(now.getFullYear(), now.getMonth(), clamp(now.getFullYear(), now.getMonth()));
  if (candidate < now) {
    const m = now.getMonth() + 1;
    candidate = new Date(now.getFullYear(), m, clamp(now.getFullYear(), m));
  }
  return candidate;
}

export const daysUntil = (d: Date) =>
  Math.round((d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);

export type Alert = {
  id: string;
  card: CreditCard;
  kind: "corte" | "pago" | "vencida";
  date: Date;
  days: number;
};

export function buildAlerts(cards: CreditCard[], paidCardIdsThisCycle: Set<string>): Alert[] {
  const alerts: Alert[] = [];
  for (const card of cards) {
    const cut = nextDateForDay(card.statement_day);
    const due = nextDateForDay(card.due_day);
    const cutDays = daysUntil(cut);
    const dueDays = daysUntil(due);
    if (cutDays >= 0 && cutDays <= 3) {
      alerts.push({ id: `${card.id}-corte`, card, kind: "corte", date: cut, days: cutDays });
    }
    if (dueDays >= 0 && dueDays <= 3) {
      alerts.push({ id: `${card.id}-pago`, card, kind: "pago", date: due, days: dueDays });
    }
    // Vencida: la fecha límite de este mes ya pasó y no hay pago registrado en el ciclo.
    const now = new Date();
    const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), Math.min(card.due_day, 28));
    if (thisMonthDue < new Date(now.getFullYear(), now.getMonth(), now.getDate()) && !paidCardIdsThisCycle.has(card.id)) {
      alerts.push({
        id: `${card.id}-vencida`,
        card,
        kind: "vencida",
        date: thisMonthDue,
        days: daysUntil(thisMonthDue),
      });
    }
  }
  return alerts.sort((a, b) => a.date.getTime() - b.date.getTime());
}
