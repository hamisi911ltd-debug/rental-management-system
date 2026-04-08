import {
  useGetDashboardSummary,
  useGetTopDebtors,
  useGetRecentActivity,
  useGetMonthlyRevenue,
} from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Building2, Users, CreditCard, Wrench, TrendingUp, AlertTriangle } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  color = "text-primary",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`rounded-lg bg-primary/10 p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: topDebtors } = useGetTopDebtors();
  const { data: recentActivity } = useGetRecentActivity();
  const { data: monthlyRevenue } = useGetMonthlyRevenue();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your portfolio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(summary?.totalRevenue ?? 0)}
          icon={TrendingUp}
          sub="All-time collected"
        />
        <StatCard
          label="Occupancy Rate"
          value={`${summary?.occupancyRate ?? 0}%`}
          icon={Building2}
          sub={`${summary?.vacantUnits ?? 0} units vacant`}
        />
        <StatCard
          label="Pending Maintenance"
          value={summary?.pendingMaintenance ?? 0}
          icon={Wrench}
          color="text-orange-500"
          sub="Open tickets"
        />
        <StatCard
          label="Overdue Payments"
          value={summary?.overduePayments ?? 0}
          icon={AlertTriangle}
          color="text-red-500"
          sub={`${formatCurrency(summary?.collectedThisMonth ?? 0)} this month`}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Properties"
          value={summary?.totalProperties ?? 0}
          icon={Building2}
        />
        <StatCard
          label="Total Units"
          value={summary?.totalUnits ?? 0}
          icon={Users}
        />
        <StatCard
          label="Collected This Month"
          value={formatCurrency(summary?.collectedThisMonth ?? 0)}
          icon={CreditCard}
          color="text-green-600"
        />
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyRevenue ?? []} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="expenses" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Recent Activity</h2>
          <ul className="space-y-3">
            {(recentActivity ?? []).slice(0, 6).map((item) => (
              <li key={item.id} className="flex gap-3 text-sm">
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    item.type === "payment"
                      ? "bg-green-500"
                      : item.type === "maintenance"
                      ? "bg-orange-500"
                      : "bg-blue-500"
                  }`}
                />
                <div className="min-w-0">
                  <p className="leading-tight text-foreground truncate">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <li className="text-sm text-muted-foreground">No recent activity</li>
            )}
          </ul>
        </div>
      </div>

      {/* Top Debtors */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Top Debtors</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Tenant</th>
                <th className="pb-2 pr-4 font-medium">Unit</th>
                <th className="pb-2 pr-4 font-medium">Months Overdue</th>
                <th className="pb-2 font-medium text-right">Amount Owed</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(topDebtors ?? []).map((d) => (
                <tr key={d.tenantId} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{d.tenantName}</div>
                    <div className="text-xs text-muted-foreground">{d.email}</div>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {d.unitName ?? "—"} {d.propertyName ? `· ${d.propertyName}` : ""}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      {d.monthsOverdue} month{d.monthsOverdue !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="py-2 text-right font-semibold text-red-600">
                    {formatCurrency(d.totalOwed)}
                  </td>
                </tr>
              ))}
              {(!topDebtors || topDebtors.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No outstanding debts
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
