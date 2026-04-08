import { useState } from "react";
import {
  useListMaintenanceTickets,
  useCreateMaintenanceTicket,
  useUpdateMaintenanceTicket,
  useDeleteMaintenanceTicket,
  useListTenants,
  useListAllUnits,
  getListMaintenanceTicketsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
import type { MaintenanceTicket } from "@workspace/api-client-react";

type Priority = "low" | "medium" | "high" | "urgent";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type Category = "plumbing" | "electrical" | "hvac" | "appliance" | "structural" | "other";

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

const nextStatus: Record<string, TicketStatus> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
  closed: "open",
};

export default function Maintenance() {
  const qc = useQueryClient();
  const { data: tickets = [] } = useListMaintenanceTickets();
  const { data: tenants = [] } = useListTenants();
  const { data: units = [] } = useListAllUnits();
  const createTicket = useCreateMaintenanceTicket();
  const updateTicket = useUpdateMaintenanceTicket();
  const deleteTicket = useDeleteMaintenanceTicket();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MaintenanceTicket | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | TicketStatus>("all");
  const [filterPriority, setFilterPriority] = useState<"all" | Priority>("all");
  const [form, setForm] = useState({
    tenantId: null as number | null,
    unitId: null as number | null,
    title: "", description: "",
    priority: "medium" as Priority,
    status: "open" as TicketStatus,
    category: "other" as Category,
    assignedTo: "",
  });

  function openModal(t?: MaintenanceTicket) {
    if (t) {
      setEditing(t);
      setForm({
        tenantId: t.tenantId ?? null, unitId: t.unitId ?? null,
        title: t.title, description: t.description,
        priority: t.priority as Priority, status: t.status as TicketStatus,
        category: t.category as Category, assignedTo: t.assignedTo ?? "",
      });
    } else {
      setEditing(null);
      setForm({ tenantId: null, unitId: null, title: "", description: "", priority: "medium", status: "open", category: "other", assignedTo: "" });
    }
    setShowModal(true);
  }

  async function save() {
    const body = {
      ...form,
      assignedTo: form.assignedTo || null,
    };
    if (editing) {
      await updateTicket.mutateAsync({ id: editing.id, data: body });
    } else {
      await createTicket.mutateAsync({ data: body });
    }
    qc.invalidateQueries({ queryKey: getListMaintenanceTicketsQueryKey() });
    setShowModal(false);
  }

  async function advanceStatus(t: MaintenanceTicket) {
    const ns = nextStatus[t.status] ?? "open";
    await updateTicket.mutateAsync({ id: t.id, data: { status: ns } });
    qc.invalidateQueries({ queryKey: getListMaintenanceTicketsQueryKey() });
  }

  async function del(id: number) {
    if (!confirm("Delete this ticket?")) return;
    await deleteTicket.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListMaintenanceTicketsQueryKey() });
  }

  let filtered = tickets;
  if (filterStatus !== "all") filtered = filtered.filter((t) => t.status === filterStatus);
  if (filterPriority !== "all") filtered = filtered.filter((t) => t.priority === filterPriority);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance</h1>
          <p className="text-sm text-muted-foreground mt-1">{tickets.filter((t) => t.status === "open" || t.status === "in_progress").length} active tickets</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New Ticket
        </button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-1">
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"}`}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "urgent", "high", "medium", "low"] as const).map((p) => (
            <button key={p} onClick={() => setFilterPriority(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterPriority === p ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"}`}>
              {p === "all" ? "All Priority" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-orange-50 p-2 mt-0.5">
                <Wrench className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[t.priority] ?? priorityColors.medium}`}>{t.priority}</span>
                    <button
                      onClick={() => advanceStatus(t)}
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${statusColors[t.status] ?? statusColors.open}`}
                      title="Click to advance status"
                    >
                      {t.status.replace("_", " ")}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span>{t.category}</span>
                  {t.tenantName && <span>Tenant: {t.tenantName}</span>}
                  {t.unitNumber && <span>Unit: {t.unitNumber}{t.propertyName ? ` · ${t.propertyName}` : ""}</span>}
                  {t.assignedTo && <span>Assigned: {t.assignedTo}</span>}
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openModal(t)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(t.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />No tickets found
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? "Edit Ticket" : "New Ticket"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}>
                    {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TicketStatus }))}>
                    {["open", "in_progress", "resolved", "closed"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}>
                  {["plumbing", "electrical", "hvac", "appliance", "structural", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tenant (optional)</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.tenantId ?? ""} onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value ? +e.target.value : null }))}>
                  <option value="">None</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit (optional)</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.unitId ?? ""} onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value ? +e.target.value : null }))}>
                  <option value="">None</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.propertyName} — Unit {u.unitNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assigned To</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} />
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
