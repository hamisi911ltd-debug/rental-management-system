import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable, tenantsTable, leasesTable, unitsTable, propertiesTable } from "@workspace/db";
import {
  CreatePaymentBody,
  GetPaymentParams,
  UpdatePaymentParams,
  UpdatePaymentBody,
  UpdatePaymentResponse,
  DeletePaymentParams,
  ListPaymentsResponse,
  GetPaymentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichPayment(payment: typeof paymentsTable.$inferSelect) {
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, payment.tenantId));
  const [lease] = await db.select().from(leasesTable).where(eq(leasesTable.id, payment.leaseId));
  let unitNumber = null;
  let propertyName = null;
  if (lease) {
    const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, lease.unitId));
    if (unit) {
      unitNumber = unit.unitNumber;
      const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, unit.propertyId));
      propertyName = property?.name ?? null;
    }
  }
  return {
    ...payment,
    tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : null,
    unitNumber,
    propertyName,
    amount: parseFloat(payment.amount),
  };
}

router.get("/payments", async (_req, res): Promise<void> => {
  const payments = await db.select().from(paymentsTable).orderBy(paymentsTable.createdAt);
  const enriched = await Promise.all(payments.map(enrichPayment));
  res.json(ListPaymentsResponse.parse(enriched));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse({
    ...req.body,
    amount: String(req.body.amount),
  });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [payment] = await db.insert(paymentsTable).values(parsed.data).returning();
  const enriched = await enrichPayment(payment);
  res.status(201).json(GetPaymentResponse.parse(enriched));
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = GetPaymentParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  const enriched = await enrichPayment(payment);
  res.json(GetPaymentResponse.parse(enriched));
});

router.put("/payments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = UpdatePaymentParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body: Record<string, unknown> = { ...req.body };
  if (body.amount != null) body.amount = String(body.amount);

  const parsed = UpdatePaymentBody.safeParse(body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [payment] = await db.update(paymentsTable).set(parsed.data).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  const enriched = await enrichPayment(payment);
  res.json(UpdatePaymentResponse.parse(enriched));
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = DeletePaymentParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
