import { useState } from "react";
import {
  useListLeases,
  useCreateLease,
  useUpdateLease,
  useDeleteLease,
  useListTenants,
  useListAllUnits,
  getListLeasesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import type { Lease } from "@workspace/api-client-react";

type LeaseStatus = "active" | "expired" | "terminated" | "pending";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-100 text-gray-600",
  terminated: "bg-red-100 text-red-800",
};

export default function Leases() {
  const qc = useQueryClient();
  const { data: leases = [] } = useListLeases();
  const { data: tenants = [] } = useListTenants();
  const { data: units = [] } = useListAllUnits();
  const createLease = useCreateLease();
  const updateLease = useUpdateLease();
  const deleteLease = useDeleteLease();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lease | null>(null);
  const [form, setForm] = useState({
    tenantId: 0, unitId: 0, startDate: "", endDate: "",
    monthlyRent: 0, deposit: 0, status: "active" as LeaseStatus, notes: "",
  });

  function openModal(l?: Lease) {
    if (l) {
      setEditing(l);
      setForm({
        tenantId: l.tenantId, unitId: l.unitId, startDate: l.startDate, endDate: l.endDate,
        monthlyRent: l.monthlyRent, deposit: l.deposit, status: l.status as LeaseStatus, notes: l.notes ?? "",
      });
    } else {
      setEditing(null);
      setForm({ tenantId: 0, unitId: 0, startDate: "", endDate: "", monthlyRent: 0, deposit: 0, status: "active", notes: "" });
    }
    setShowModal(true);
  }

  async function save() {
    const body = { ...form };
    if (editing) {
      await updateLease.mutateAsync({ id: editing.id, data: body });
    } else {
      await createLease.mutateAsync({ data: body });
    }
    qc.invalidateQueries({ queryKey: getListLeasesQueryKey() });
    setShowModal(false);
  }

  async function del(id: number) {
    if (!confirm("Delete this lease?")) return;
    await deleteLease.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListLeasesQueryKey() });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leases</h1>
          <p className="text-sm text-muted-foreground mt-1">{leases.length} leases</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New Lease
        </button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {["Tenant", "Property / Unit", "Period", "Monthly Rent", "Deposit", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {leases.map((l) => (
                <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{l.tenantName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.propertyName ?? "—"} / Unit {l.unitNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.startDate} → {l.endDate}</td>
                  <td className="px-4 py-3 font-medium">${l.monthlyRent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">${l.deposit.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[l.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openModal(l)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => del(l.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {leases.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />No leases found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? "Edit Lease" : "New Lease"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tenant</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.tenantId} onChange={(e) => setForm((f) => ({ ...f, tenantId: +e.target.value }))}>
                  <option value={0}>Select tenant...</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.unitId} onChange={(e) => setForm((f) => ({ ...f, unitId: +e.target.value }))}>
                  <option value={0}>Select unit...</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.propertyName} - Unit {u.unitNumber}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Rent ($)</label>
                  <input type="number" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.monthlyRent} onChange={(e) => setForm((f) => ({ ...f, monthlyRent: +e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deposit ($)</label>
                  <input type="number" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.deposit} onChange={(e) => setForm((f) => ({ ...f, deposit: +e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as LeaseStatus }))}>
                  {["active", "pending", "expired", "terminated"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
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
