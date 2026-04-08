import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";
import {
  CreateTenantBody,
  GetTenantParams,
  UpdateTenantParams,
  UpdateTenantBody,
  UpdateTenantResponse,
  DeleteTenantParams,
  ListTenantsResponse,
  GetTenantResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tenants", async (_req, res): Promise<void> => {
  const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);
  res.json(ListTenantsResponse.parse(tenants));
});

router.post("/tenants", async (req, res): Promise<void> => {
  const parsed = CreateTenantBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [tenant] = await db.insert(tenantsTable).values(parsed.data).returning();
  res.status(201).json(GetTenantResponse.parse(tenant));
});

router.get("/tenants/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = GetTenantParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, params.data.id));
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

  res.json(GetTenantResponse.parse(tenant));
});

router.put("/tenants/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = UpdateTenantParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateTenantBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [tenant] = await db.update(tenantsTable).set(parsed.data).where(eq(tenantsTable.id, params.data.id)).returning();
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

  res.json(UpdateTenantResponse.parse(tenant));
});

router.delete("/tenants/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = DeleteTenantParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(tenantsTable).where(eq(tenantsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
