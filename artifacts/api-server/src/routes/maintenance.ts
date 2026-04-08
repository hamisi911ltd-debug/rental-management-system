import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, maintenanceTicketsTable, tenantsTable, unitsTable, propertiesTable } from "@workspace/db";
import {
  CreateMaintenanceTicketBody,
  GetMaintenanceTicketParams,
  UpdateMaintenanceTicketParams,
  UpdateMaintenanceTicketBody,
  UpdateMaintenanceTicketResponse,
  DeleteMaintenanceTicketParams,
  ListMaintenanceTicketsResponse,
  GetMaintenanceTicketResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichTicket(ticket: typeof maintenanceTicketsTable.$inferSelect) {
  let tenantName = null;
  let unitNumber = null;
  let propertyName = null;

  if (ticket.tenantId) {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, ticket.tenantId));
    if (tenant) tenantName = `${tenant.firstName} ${tenant.lastName}`;
  }

  if (ticket.unitId) {
    const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, ticket.unitId));
    if (unit) {
      unitNumber = unit.unitNumber;
      const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, unit.propertyId));
      propertyName = property?.name ?? null;
    }
  }

  return { ...ticket, tenantName, unitNumber, propertyName };
}

router.get("/maintenance", async (_req, res): Promise<void> => {
  const tickets = await db.select().from(maintenanceTicketsTable).orderBy(maintenanceTicketsTable.createdAt);
  const enriched = await Promise.all(tickets.map(enrichTicket));
  res.json(ListMaintenanceTicketsResponse.parse(enriched));
});

router.post("/maintenance", async (req, res): Promise<void> => {
  const parsed = CreateMaintenanceTicketBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [ticket] = await db.insert(maintenanceTicketsTable).values(parsed.data).returning();
  const enriched = await enrichTicket(ticket);
  res.status(201).json(GetMaintenanceTicketResponse.parse(enriched));
});

router.get("/maintenance/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = GetMaintenanceTicketParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [ticket] = await db.select().from(maintenanceTicketsTable).where(eq(maintenanceTicketsTable.id, params.data.id));
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const enriched = await enrichTicket(ticket);
  res.json(GetMaintenanceTicketResponse.parse(enriched));
});

router.put("/maintenance/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = UpdateMaintenanceTicketParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateMaintenanceTicketBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "resolved") {
    updateData.resolvedAt = new Date();
  }

  const [ticket] = await db.update(maintenanceTicketsTable).set(updateData).where(eq(maintenanceTicketsTable.id, params.data.id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const enriched = await enrichTicket(ticket);
  res.json(UpdateMaintenanceTicketResponse.parse(enriched));
});

router.delete("/maintenance/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = DeleteMaintenanceTicketParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(maintenanceTicketsTable).where(eq(maintenanceTicketsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
