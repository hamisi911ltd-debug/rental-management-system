import { useState } from "react";
import {
  useListTenants,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  getListTenantsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Users, Search } from "lucide-react";
import type { Tenant } from "@workspace/api-client-react";

export default function Tenants() {
  const qc = useQueryClient();
  const { data: tenants = [] } = useListTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    idNumber: "", emergencyContactName: "", emergencyContactPhone: "", notes: "",
  });

  function openModal(t?: Tenant) {
    if (t) {
      setEditing(t);
      setForm({
        firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone,
        idNumber: t.idNumber ?? "", emergencyContactName: t.emergencyContactName ?? "",
        emergencyContactPhone: t.emergencyContactPhone ?? "", notes: t.notes ?? "",
      });
    } else {
      setEditing(null);
      setForm({ firstName: "", lastName: "", email: "", phone: "", idNumber: "", emergencyContactName: "", emergencyContactPhone: "", notes: "" });
    }
    setShowModal(true);
  }

  async function save() {
    if (editing) {
      await updateTenant.mutateAsync({ id: editing.id, data: form });
    } else {
      await createTenant.mutateAsync({ data: form });
    }
    qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
    setShowModal(false);
  }

  async function del(id: number) {
    if (!confirm("Delete this tenant?")) return;
    await deleteTenant.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
  }

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    return `${t.firstName} ${t.lastName} ${t.email} ${t.phone}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">{tenants.length} tenants registered</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Tenant
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full rounded-lg border bg-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search tenants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {["Name", "Email", "Phone", "ID Number", "Emergency Contact", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.firstName} {t.lastName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.idNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.emergencyContactName ? `${t.emergencyContactName} ${t.emergencyContactPhone ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openModal(t)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => del(t.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-30" />No tenants found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? "Edit Tenant" : "Add Tenant"}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID Number</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.idNumber} onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Emergency Contact</label>
                  <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.emergencyContactName} onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Emergency Phone</label>
                  <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.emergencyContactPhone} onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
