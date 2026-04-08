import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import type { User } from "@workspace/api-client-react";

type UserRole = "admin" | "staff";

export default function UserManagement() {
  const qc = useQueryClient();
  const { data: users = [] } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "staff" as UserRole, isActive: true, password: "" });

  function openModal(u?: User) {
    if (u) {
      setEditing(u);
      setForm({ name: u.name, email: u.email, role: u.role as UserRole, isActive: u.isActive, password: "" });
    } else {
      setEditing(null);
      setForm({ name: "", email: "", role: "staff", isActive: true, password: "" });
    }
    setShowModal(true);
  }

  async function save() {
    const body = { name: form.name, email: form.email, role: form.role, isActive: form.isActive };
    if (editing) {
      await updateUser.mutateAsync({ id: editing.id, data: body });
    } else {
      await createUser.mutateAsync({ data: { ...body, password: form.password || undefined } });
    }
    qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    setShowModal(false);
  }

  async function del(id: number) {
    if (!confirm("Delete this user?")) return;
    await deleteUser.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} users</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{u.name}</p>
                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                    {u.role}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openModal(u)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(u.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="col-span-3 rounded-xl border bg-card p-12 text-center text-muted-foreground">
            <UserCog className="h-8 w-8 mx-auto mb-2 opacity-30" />No users found
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editing ? "Edit User" : "Add User"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                <label htmlFor="isActive" className="text-sm font-medium">Active</label>
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input type="password" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
              )}
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
