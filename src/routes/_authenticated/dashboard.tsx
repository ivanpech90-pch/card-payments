import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, CalendarClock, CreditCard as CardIcon, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCards, usePayments } from "@/lib/data";
import { buildAlerts, currency, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard de pagos de tarjetas | Pagos" },
      { name: "description", content: "Resumen de pagos, alertas de corte y fechas límite de tus tarjetas de crédito." },
      { property: "og:title", content: "Dashboard de pagos de tarjetas" },
      { property: "og:description", content: "KPIs, gráficas y alertas de tus tarjetas de crédito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function DashboardPage() {
  const { data: cards = [] } = useCards();
  const { data: payments = [] } = usePayments();

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const monthTotal = payments
    .filter((p) => p.paid_at.startsWith(monthKey))
    .reduce((s, p) => s + Number(p.amount), 0);
  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  const alerts = useMemo(() => {
    const paidThisCycle = new Set(payments.filter((p) => p.paid_at.startsWith(monthKey)).map((p) => p.card_id));
    return buildAlerts(cards, paidThisCycle);
  }, [cards, payments, monthKey]);

  const byMonth = useMemo(() => {
    const out: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({
        label: MONTHS[d.getMonth()] ?? "",
        total: payments.filter((p) => p.paid_at.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0),
      });
    }
    return out;
  }, [payments, now]);

  const byCard = useMemo(
    () =>
      cards
        .map((c) => ({
          name: c.name,
          color: c.color,
          value: payments.filter((p) => p.card_id === c.id).reduce((s, p) => s + Number(p.amount), 0),
        }))
        .filter((d) => d.value > 0),
    [cards, payments],
  );

  const kpis = [
    { label: "Pagado este mes", value: currency(monthTotal), icon: TrendingUp },
    { label: "Pagado histórico", value: currency(total), icon: CalendarClock },
    { label: "Tarjetas activas", value: String(cards.length), icon: CardIcon },
    { label: "Alertas", value: String(alerts.length), icon: AlertTriangle },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="surface">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-2xl font-semibold">{k.value}</p>
              </div>
              <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground">
                <k.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length > 0 && (
        <Card className="surface">
          <CardHeader>
            <CardTitle className="text-base">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {a.card.name} {a.card.last4 ? `••${a.card.last4}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.kind === "corte" ? "Fecha de corte" : a.kind === "pago" ? "Fecha límite de pago" : "Pago vencido"} ·{" "}
                    {shortDate(a.date.toISOString().slice(0, 10))}
                  </p>
                </div>
                <Badge variant={a.kind === "vencida" ? "destructive" : a.kind === "pago" ? "default" : "secondary"}>
                  {a.days === 0 ? "Hoy" : a.days > 0 ? `En ${a.days}d` : `${Math.abs(a.days)}d tarde`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface">
          <CardHeader>
            <CardTitle className="text-base">Pagos por mes</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} tickFormatter={(v) => currency(v)} />
                <Tooltip formatter={(v: number) => currency(v)} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="var(--color-primary, #2563eb)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="surface">
          <CardHeader>
            <CardTitle className="text-base">Distribución por tarjeta</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {byCard.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                Aún no hay pagos registrados.
                <Button asChild size="sm">
                  <Link to="/payments">Registrar pago</Link>
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCard} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {byCard.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: number) => currency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
