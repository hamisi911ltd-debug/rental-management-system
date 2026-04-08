import { useState } from "react";
import {
  useListPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useListLeases,
  useListTenants,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { Payment } from "@workspace/api-client-react";

type PaymentStatus = "paid" | "pending" | "overdue";
type PaymentMethod = "cash" | "bank_transfer" | "check" | "card" | "other";

const statusConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  paid: { label: "Paid", icon: CheckCircle2, cls: "text-green-700 bg-green-100" },
  pending: { label: "Pending", icon: Clock, cls: "text-yellow-700 bg-yellow-100" },
  overdue: { label: "Overdue", icon: AlertCircle, cls: "text-red-700 bg-red-100" },
};

export default function Payments() {
  const qc = useQueryClient();
  const { data: payments = [] } = useListPayments();
  const { data: leases = [] } = useListLeases();
  const { data: tenants = [] } = useListTenants();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentStatus>("all");
  const [form, setForm] = useState({
    leaseId: 0, tenantId: 0, amount: 0, dueDate: "",
    paidDate: "", status: "pending" as PaymentStatus, method: "" as PaymentMethod | "", notes: "",
  });

  async function toggleStatus(p: Payment) {
    const newStatus: PaymentStatus = p.status === "paid" ? "pending" : "paid";
    const paidDate = newStatus === "paid" ? new Date().toISOString().split("T")[0] : null;
    await updatePayment.mutateAsync({ id: p.id, data: { status: newStatus, paidDate } });
    qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
  }

  async function save() {
    const body = {
      ...form,
      paidDate: form.paidDate || null,
      method: form.method || null,
    };
    await createPayment.mutateAsync({ data: body });
    qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
    setShowModal(false);
  }

  async function del(id: number) {
    if (!confirm("Delete this payment?")) return;
    await deletePayment.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
  }

  const filtered = filterStatus === "all" ? payments : payments.filter((p) => p.status === filterStatus);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">{payments.length} transactions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Record Payment
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "paid", "pending", "overdue"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">
              ({s === "all" ? payments.length : payments.filter((p) => p.status === s).length})
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {["Tenant", "Property / Unit", "Amount", "Due Date", "Paid Date", "Method", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => {
                const cfg = statusConfig[p.status] ?? statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.tenantName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.propertyName ?? "—"} / {p.unitNumber ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold">${p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.dueDate}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.paidDate ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{p.method?.replace("_", " ") ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(p)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${cfg.cls}`}
                        title="Click to toggle status"
                      >
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => del(p.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />No payments found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Lease</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.leaseId}
                  onChange={(e) => {
                    const lease = leases.find((l) => l.id === +e.target.value);
                    setForm((f) => ({
                      ...f,
                      leaseId: +e.target.value,
                      tenantId: lease?.tenantId ?? 0,
                      amount: lease?.monthlyRent ?? 0,
                    }));
                  }}
                >
                  <option value={0}>Select lease...</option>
                  {leases.map((l) => <option key={l.id} value={l.id}>{l.tenantName} — {l.propertyName} Unit {l.unitNumber}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount ($)</label>
                  <input type="number" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: +e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PaymentStatus }))}>
                    {["paid", "pending", "overdue"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Method</label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethod | "" }))}>
                    <option value="">None</option>
                    {["cash", "bank_transfer", "check", "card", "other"].map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              {form.status === "paid" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Paid Date</label>
                  <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.paidDate} onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
