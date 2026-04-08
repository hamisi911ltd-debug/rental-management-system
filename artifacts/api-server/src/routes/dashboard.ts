import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  propertiesTable,
  unitsTable,
  tenantsTable,
  leasesTable,
  paymentsTable,
  maintenanceTicketsTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetTopDebtorsResponse,
  GetRecentActivityResponse,
  GetMonthlyRevenueResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const allUnits = await db.select().from(unitsTable);
  const totalUnits = allUnits.length;
  const vacantUnits = allUnits.filter((u) => u.status === "vacant").length;
  const occupiedUnits = allUnits.filter((u) => u.status === "occupied").length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const properties = await db.select().from(propertiesTable);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const allPayments = await db.select().from(paymentsTable);
  const overduePayments = allPayments.filter((p) => p.status === "overdue").length;
  const collectedThisMonth = allPayments
    .filter((p) => p.status === "paid" && p.paidDate && p.paidDate >= monthStart && p.paidDate <= monthEnd)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalRevenue = allPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const pendingMaintenance = await db
    .select({ count: sql<number>`count(*)` })
    .from(maintenanceTicketsTable)
    .where(sql`status IN ('open', 'in_progress')`);

  const result = {
    totalRevenue,
    occupancyRate,
    pendingMaintenance: Number(pendingMaintenance[0]?.count ?? 0),
    totalProperties: properties.length,
    totalUnits,
    vacantUnits,
    overduePayments,
    collectedThisMonth,
  };

  res.json(GetDashboardSummaryResponse.parse(result));
});

router.get("/dashboard/top-debtors", async (_req, res): Promise<void> => {
  const overdue = await db.select().from(paymentsTable).where(sql`status = 'overdue'`);

  const byTenant: Record<number, { totalOwed: number; count: number }> = {};
  for (const p of overdue) {
    if (!byTenant[p.tenantId]) byTenant[p.tenantId] = { totalOwed: 0, count: 0 };
    byTenant[p.tenantId].totalOwed += parseFloat(p.amount);
    byTenant[p.tenantId].count += 1;
  }

  const tenantIds = Object.keys(byTenant).map(Number);
  if (tenantIds.length === 0) {
    res.json(GetTopDebtorsResponse.parse([]));
    return;
  }

  const tenants = await db.select().from(tenantsTable);
  const leases = await db.select().from(leasesTable);
  const units = await db.select().from(unitsTable);
  const properties = await db.select().from(propertiesTable);

  const debtors = tenantIds
    .map((tenantId) => {
      const tenant = tenants.find((t) => t.id === tenantId);
      if (!tenant) return null;
      const lease = leases.find((l) => l.tenantId === tenantId && l.status === "active");
      const unit = lease ? units.find((u) => u.id === lease.unitId) : null;
      const property = unit ? properties.find((p) => p.id === unit.propertyId) : null;
      return {
        tenantId,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        email: tenant.email,
        phone: tenant.phone,
        totalOwed: byTenant[tenantId].totalOwed,
        monthsOverdue: byTenant[tenantId].count,
        unitName: unit?.unitNumber ?? null,
        propertyName: property?.name ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b!.totalOwed - a!.totalOwed))
    .slice(0, 10);

  res.json(GetTopDebtorsResponse.parse(debtors));
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const payments = await db.select().from(paymentsTable).orderBy(sql`created_at DESC`).limit(5);
  const tickets = await db.select().from(maintenanceTicketsTable).orderBy(sql`created_at DESC`).limit(5);
  const tenants = await db.select().from(tenantsTable).orderBy(sql`created_at DESC`).limit(3);

  const tenantMap: Record<number, string> = {};
  const allTenants = await db.select().from(tenantsTable);
  for (const t of allTenants) {
    tenantMap[t.id] = `${t.firstName} ${t.lastName}`;
  }

  const activities: Array<{ id: number; type: string; description: string; timestamp: Date; status: string }> = [];

  for (const p of payments) {
    activities.push({
      id: p.id,
      type: "payment",
      description: `Payment of $${parseFloat(p.amount).toFixed(2)} recorded for tenant ${tenantMap[p.tenantId] ?? "Unknown"}`,
      timestamp: p.createdAt,
      status: p.status,
    });
  }

  for (const t of tickets) {
    activities.push({
      id: t.id + 10000,
      type: "maintenance",
      description: `Maintenance ticket: ${t.title}`,
      timestamp: t.createdAt,
      status: t.status,
    });
  }

  for (const t of tenants) {
    activities.push({
      id: t.id + 20000,
      type: "tenant",
      description: `New tenant registered: ${t.firstName} ${t.lastName}`,
      timestamp: t.createdAt,
      status: "active",
    });
  }

  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json(GetRecentActivityResponse.parse(activities.slice(0, 10)));
});

router.get("/dashboard/monthly-revenue", async (_req, res): Promise<void> => {
  const allPayments = await db.select().from(paymentsTable).where(sql`status = 'paid'`);

  const monthMap: Record<string, { revenue: number; expenses: number }> = {};

  for (const p of allPayments) {
    const date = new Date(p.paidDate ?? p.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { revenue: 0, expenses: 0 };
    monthMap[key].revenue += parseFloat(p.amount);
    monthMap[key].expenses += parseFloat(p.amount) * 0.25;
  }

  const now = new Date();
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    result.push({
      month: label,
      revenue: monthMap[key]?.revenue ?? 0,
      expenses: monthMap[key]?.expenses ?? 0,
    });
  }

  res.json(GetMonthlyRevenueResponse.parse(result));
});

export default router;
