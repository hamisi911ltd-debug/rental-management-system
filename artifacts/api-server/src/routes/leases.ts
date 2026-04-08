import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leasesTable, tenantsTable, unitsTable, propertiesTable } from "@workspace/db";
import {
  CreateLeaseBody,
  GetLeaseParams,
  UpdateLeaseParams,
  UpdateLeaseBody,
  UpdateLeaseResponse,
  DeleteLeaseParams,
  ListLeasesResponse,
  GetLeaseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichLease(lease: typeof leasesTable.$inferSelect) {
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, lease.tenantId));
  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, lease.unitId));
  let propertyName = null;
  if (unit) {
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, unit.propertyId));
    propertyName = property?.name ?? null;
  }
  return {
    ...lease,
    tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : null,
    unitNumber: unit?.unitNumber ?? null,
    propertyName,
    monthlyRent: parseFloat(lease.monthlyRent),
    deposit: parseFloat(lease.deposit),
  };
}

router.get("/leases", async (_req, res): Promise<void> => {
  const leases = await db.select().from(leasesTable).orderBy(leasesTable.createdAt);
  const enriched = await Promise.all(leases.map(enrichLease));
  res.json(ListLeasesResponse.parse(enriched));
});

router.post("/leases", async (req, res): Promise<void> => {
  const parsed = CreateLeaseBody.safeParse({
    ...req.body,
    monthlyRent: String(req.body.monthlyRent),
    deposit: String(req.body.deposit ?? "0"),
  });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [lease] = await db.insert(leasesTable).values(parsed.data).returning();
  const enriched = await enrichLease(lease);
  res.status(201).json(GetLeaseResponse.parse(enriched));
});

router.get("/leases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = GetLeaseParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [lease] = await db.select().from(leasesTable).where(eq(leasesTable.id, params.data.id));
  if (!lease) { res.status(404).json({ error: "Lease not found" }); return; }

  const enriched = await enrichLease(lease);
  res.json(GetLeaseResponse.parse(enriched));
});

router.put("/leases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = UpdateLeaseParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body: Record<string, unknown> = { ...req.body };
  if (body.monthlyRent != null) body.monthlyRent = String(body.monthlyRent);
  if (body.deposit != null) body.deposit = String(body.deposit);

  const parsed = UpdateLeaseBody.safeParse(body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [lease] = await db.update(leasesTable).set(parsed.data).where(eq(leasesTable.id, params.data.id)).returning();
  if (!lease) { res.status(404).json({ error: "Lease not found" }); return; }

  const enriched = await enrichLease(lease);
  res.json(UpdateLeaseResponse.parse(enriched));
});

router.delete("/leases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = DeleteLeaseParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(leasesTable).where(eq(leasesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
