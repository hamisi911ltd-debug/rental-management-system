import { useState } from "react";
import {
  useListProperties,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
  useListAllUnits,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
  getListPropertiesQueryKey,
  getListAllUnitsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2, ChevronDown, ChevronUp } from "lucide-react";
import type { Property, Unit } from "@workspace/api-client-react";

type PropertyType = "apartment" | "house" | "commercial" | "condo";
type UnitStatus = "vacant" | "occupied" | "maintenance";

function Badge({ label, variant }: { label: string; variant: "green" | "gray" | "orange" | "blue" }) {
  const styles = {
    green: "bg-green-100 text-green-800",
    gray: "bg-gray-100 text-gray-700",
    orange: "bg-orange-100 text-orange-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  );
}

export default function Properties() {
  const qc = useQueryClient();
  const { data: properties = [] } = useListProperties();
  const { data: allUnits = [] } = useListAllUnits();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();

  const [showModal, setShowModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  const [propForm, setPropForm] = useState({ name: "", address: "", city: "", state: "", zipCode: "", type: "apartment" as PropertyType });
  const [unitForm, setUnitForm] = useState({ propertyId: 0, unitNumber: "", floor: 1, bedrooms: 1, bathrooms: 1, rentAmount: 0, status: "vacant" as UnitStatus });

  function openPropModal(p?: Property) {
    if (p) {
      setEditingProperty(p);
      setPropForm({ name: p.name, address: p.address, city: p.city, state: p.state, zipCode: p.zipCode ?? "", type: p.type as PropertyType });
    } else {
      setEditingProperty(null);
      setPropForm({ name: "", address: "", city: "", state: "", zipCode: "", type: "apartment" });
    }
    setShowModal(true);
  }

  function openUnitModal(propertyId: number, u?: Unit) {
    setSelectedPropertyId(propertyId);
    if (u) {
      setEditingUnit(u);
      setUnitForm({ propertyId, unitNumber: u.unitNumber, floor: u.floor ?? 1, bedrooms: u.bedrooms, bathrooms: u.bathrooms, rentAmount: u.rentAmount, status: u.status as UnitStatus });
    } else {
      setEditingUnit(null);
      setUnitForm({ propertyId, unitNumber: "", floor: 1, bedrooms: 1, bathrooms: 1, rentAmount: 0, status: "vacant" });
    }
    setShowUnitModal(true);
  }

  async function saveProp() {
    const body = { ...propForm };
    if (editingProperty) {
      await updateProperty.mutateAsync({ id: editingProperty.id, data: body });
    } else {
      await createProperty.mutateAsync({ data: body });
    }
    qc.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
    setShowModal(false);
  }

  async function delProp(id: number) {
    if (!confirm("Delete this property?")) return;
    await deleteProperty.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
  }

  async function saveUnit() {
    const body = { ...unitForm };
    if (editingUnit) {
      await updateUnit.mutateAsync({ id: editingUnit.id, data: body });
    } else {
      await createUnit.mutateAsync({ data: body });
    }
    qc.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
    qc.invalidateQueries({ queryKey: getListAllUnitsQueryKey() });
    setShowUnitModal(false);
  }

  async function delUnit(id: number) {
    if (!confirm("Delete this unit?")) return;
    await deleteUnit.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
    qc.invalidateQueries({ queryKey: getListAllUnitsQueryKey() });
  }

  const statusBadge = (s: string) => {
    if (s === "occupied") return <Badge label="Occupied" variant="green" />;
    if (s === "maintenance") return <Badge label="Maintenance" variant="orange" />;
    return <Badge label="Vacant" variant="gray" />;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-sm text-muted-foreground mt-1">{properties.length} properties</p>
        </div>
        <button onClick={() => openPropModal()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Property
        </button>
      </div>

      <div className="space-y-3">
        {properties.map((p) => {
          const units = allUnits.filter((u) => u.propertyId === p.id);
          const isExpanded = expandedId === p.id;
          return (
            <div key={p.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{p.name}</p>
                    <Badge label={p.type} variant="blue" />
                  </div>
                  <p className="text-sm text-muted-foreground">{p.address}, {p.city}, {p.state}</p>
                </div>
                <div className="hidden sm:flex gap-6 text-sm text-center">
                  <div>
                    <p className="font-semibold">{p.totalUnits}</p>
                    <p className="text-xs text-muted-foreground">Units</p>
                  </div>
                  <div>
                    <p className="font-semibold text-green-600">{p.occupiedUnits}</p>
                    <p className="text-xs text-muted-foreground">Occupied</p>
                  </div>
                  <div>
                    <p className="font-semibold text-orange-500">{p.totalUnits - p.occupiedUnits}</p>
                    <p className="text-xs text-muted-foreground">Vacant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpandedId(isExpanded ? null : p.id)} className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button onClick={() => openPropModal(p)} className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => delProp(p.id)} className="p-2 text-muted-foreground hover:text-destructive rounded-md transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-muted-foreground">Units</p>
                    <button onClick={() => openUnitModal(p.id)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Plus className="h-3 w-3" /> Add Unit
                    </button>
                  </div>
                  <div className="space-y-2">
                    {units.length === 0 && <p className="text-sm text-muted-foreground">No units yet</p>}
                    {units.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                        <span className="text-sm font-medium w-16">Unit {u.unitNumber}</span>
                        <span className="text-sm text-muted-foreground">{u.bedrooms}BR / {u.bathrooms}BA</span>
                        <span className="text-sm font-medium ml-auto">${u.rentAmount.toLocaleString()}/mo</span>
                        {statusBadge(u.status)}
                        <button onClick={() => openUnitModal(p.id, u)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                        <button onClick={() => delUnit(u.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {properties.length === 0 && (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No properties yet. Add your first property to get started.</p>
          </div>
        )}
      </div>

      {/* Property Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editingProperty ? "Edit Property" : "Add Property"}</h2>
            <div className="space-y-3">
              {[
                { label: "Name", key: "name" },
                { label: "Address", key: "address" },
                { label: "City", key: "city" },
                { label: "State", key: "state" },
                { label: "Zip Code", key: "zipCode" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={(propForm as Record<string, string>)[key]}
                    onChange={(e) => setPropForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={propForm.type} onChange={(e) => setPropForm((f) => ({ ...f, type: e.target.value as PropertyType }))}>
                  {["apartment", "house", "commercial", "condo"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={saveProp} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{editingUnit ? "Edit Unit" : "Add Unit"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Unit Number</label>
                <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={unitForm.unitNumber} onChange={(e) => setUnitForm((f) => ({ ...f, unitNumber: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Bedrooms</label>
                  <input type="number" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={unitForm.bedrooms} onChange={(e) => setUnitForm((f) => ({ ...f, bedrooms: +e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bathrooms</label>
                  <input type="number" step="0.5" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={unitForm.bathrooms} onChange={(e) => setUnitForm((f) => ({ ...f, bathrooms: +e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Rent ($)</label>
                <input type="number" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={unitForm.rentAmount} onChange={(e) => setUnitForm((f) => ({ ...f, rentAmount: +e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={unitForm.status} onChange={(e) => setUnitForm((f) => ({ ...f, status: e.target.value as UnitStatus }))}>
                  {["vacant", "occupied", "maintenance"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowUnitModal(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={saveUnit} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
