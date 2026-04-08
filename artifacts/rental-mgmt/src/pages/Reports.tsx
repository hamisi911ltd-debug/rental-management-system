import { useState } from "react";
import {
  useGetProfitLossReport,
  useGetArrearsReport,
  getGetProfitLossReportQueryKey,
} from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { BarChart3, AlertTriangle } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: plReport = [] } = useGetProfitLossReport({ year }, { query: { queryKey: getGetProfitLossReportQueryKey({ year }) } });
  const { data: arrears = [] } = useGetArrearsReport();

  const totalRevenue = plReport.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = plReport.reduce((s, m) => s + m.expenses, 0);
  const totalProfit = plReport.reduce((s, m) => s + m.profit, 0);
  const totalArrears = arrears.reduce((s, a) => s + a.totalOverdue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Financial summaries and arrears</p>
      </div>

      {/* P&L Report */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Monthly Profit / Loss</h2>
          <select
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
            value={year}
            onChange={(e) => setYear(+e.target.value)}
          >
            {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-xs text-green-700 font-medium">Total Revenue</p>
            <p className="text-lg font-bold text-green-800">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-xs text-red-700 font-medium">Total Expenses</p>
            <p className="text-lg font-bold text-red-800">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${totalProfit >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
            <p className={`text-xs font-medium ${totalProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>Net Profit</p>
            <p className={`text-lg font-bold ${totalProfit >= 0 ? "text-blue-800" : "text-red-800"}`}>{formatCurrency(totalProfit)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={plReport} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(val: number) => formatCurrency(val)} />
            <Legend />
            <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar dataKey="expenses" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Expenses" />
            <Bar dataKey="profit" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Profit" />
          </BarChart>
        </ResponsiveContainer>

        {/* Monthly table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                {["Month", "Revenue", "Expenses", "Profit"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {plReport.map((m) => (
                <tr key={m.month} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{m.month}</td>
                  <td className="px-3 py-2 text-green-700">{formatCurrency(m.revenue)}</td>
                  <td className="px-3 py-2 text-red-700">{formatCurrency(m.expenses)}</td>
                  <td className={`px-3 py-2 font-semibold ${m.profit >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(m.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Arrears Report */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Arrears Report</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {formatCurrency(totalArrears)} total outstanding
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {["Tenant", "Email", "Unit / Property", "Payments", "Oldest Due", "Total Overdue"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {arrears.map((a) => (
                <tr key={a.tenantId} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{a.tenantName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.unitNumber ? `Unit ${a.unitNumber}` : "—"} {a.propertyName ? `· ${a.propertyName}` : ""}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      {a.paymentsCount} overdue
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.oldestDue}</td>
                  <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(a.totalOverdue)}</td>
                </tr>
              ))}
              {arrears.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />No arrears found — all payments are up to date
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
