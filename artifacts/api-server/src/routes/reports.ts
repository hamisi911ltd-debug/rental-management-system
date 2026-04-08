import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, paymentsTable, tenantsTable, leasesTable, unitsTable, propertiesTable } from "@workspace/db";
import {
  GetProfitLossReportResponse,
  GetProfitLossReportQueryParams,
  GetArrearsReportResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/profit-loss", async (req, res): Promise<void> => {
  const queryParams = GetProfitLossReportQueryParams.safeParse(req.query);
  const year = queryParams.success && queryParams.data.year ? queryParams.data.year : new Date().getFullYear();

  const allPayments = await db.select().from(paymentsTable).where(sql`status = 'paid'`);

  const monthMap: Record<number, { revenue: number; expenses: number }> = {};
  for (let m = 1; m <= 12; m++) {
    monthMap[m] = { revenue: 0, expenses: 0 };
  }

  for (const p of allPayments) {
    const date = new Date(p.paidDate ?? p.createdAt);
    if (date.getFullYear() !== year) continue;
    const month = date.getMonth() + 1;
    monthMap[month].revenue += parseFloat(p.amount);
    monthMap[month].expenses += parseFloat(p.amount) * 0.25;
  }

  const result = Object.entries(monthMap).map(([m, data]) => {
    const d = new Date(year, parseInt(m) - 1, 1);
    const label = d.toLocaleString("en-US", { month: "long" });
    return {
      month: label,
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses,
    };
  });

  res.json(GetProfitLossReportResponse.parse(result));
});

router.get("/reports/arrears", async (_req, res): Promise<void> => {
  const overdue = await db.select().from(paymentsTable).where(sql`status = 'overdue'`);

  const byTenant: Record<number, { total: number; count: number; oldest: string }> = {};
  for (const p of overdue) {
    if (!byTenant[p.tenantId]) {
      byTenant[p.tenantId] = { total: 0, count: 0, oldest: p.dueDate };
    }
    byTenant[p.tenantId].total += parseFloat(p.amount);
    byTenant[p.tenantId].count += 1;
    if (p.dueDate < byTenant[p.tenantId].oldest) {
      byTenant[p.tenantId].oldest = p.dueDate;
    }
  }

  const tenantIds = Object.keys(byTenant).map(Number);
  if (tenantIds.length === 0) {
    res.json(GetArrearsReportResponse.parse([]));
    return;
  }

  const tenants = await db.select().from(tenantsTable);
  const leases = await db.select().from(leasesTable);
  const units = await db.select().from(unitsTable);
  const properties = await db.select().from(propertiesTable);

  const result = tenantIds
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
        unitNumber: unit?.unitNumber ?? null,
        propertyName: property?.name ?? null,
        totalOverdue: byTenant[tenantId].total,
        paymentsCount: byTenant[tenantId].count,
        oldestDue: byTenant[tenantId].oldest,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.totalOverdue - a!.totalOverdue);

  res.json(GetArrearsReportResponse.parse(result));
});

export default router;
