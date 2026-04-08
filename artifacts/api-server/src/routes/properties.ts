import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, propertiesTable, unitsTable } from "@workspace/db";
import {
  CreatePropertyBody,
  GetPropertyParams,
  UpdatePropertyParams,
  UpdatePropertyBody,
  DeletePropertyParams,
  ListPropertiesResponse,
  GetPropertyResponse,
  UpdatePropertyResponse,
  ListUnitsParams,
  ListUnitsResponse,
  CreateUnitBody,
  UpdateUnitParams,
  UpdateUnitBody,
  UpdateUnitResponse,
  DeleteUnitParams,
  ListAllUnitsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Properties CRUD
router.get("/properties", async (_req, res): Promise<void> => {
  const properties = await db.select().from(propertiesTable).orderBy(propertiesTable.createdAt);
  const units = await db.select().from(unitsTable);

  const enriched = properties.map((p) => {
    const pUnits = units.filter((u) => u.propertyId === p.id);
    return {
      ...p,
      totalUnits: pUnits.length,
      occupiedUnits: pUnits.filter((u) => u.status === "occupied").length,
    };
  });

  res.json(ListPropertiesResponse.parse(enriched));
});

router.post("/properties", async (req, res): Promise<void> => {
  const parsed = CreatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [property] = await db.insert(propertiesTable).values(parsed.data).returning();
  const result = { ...property, totalUnits: 0, occupiedUnits: 0 };
  res.status(201).json(GetPropertyResponse.parse(result));
});

router.get("/properties/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = GetPropertyParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, params.data.id));
  if (!property) { res.status(404).json({ error: "Property not found" }); return; }

  const units = await db.select().from(unitsTable).where(eq(unitsTable.propertyId, params.data.id));
  const result = {
    ...property,
    totalUnits: units.length,
    occupiedUnits: units.filter((u) => u.status === "occupied").length,
  };
  res.json(GetPropertyResponse.parse(result));
});

router.put("/properties/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = UpdatePropertyParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdatePropertyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [property] = await db.update(propertiesTable).set(parsed.data).where(eq(propertiesTable.id, params.data.id)).returning();
  if (!property) { res.status(404).json({ error: "Property not found" }); return; }

  const units = await db.select().from(unitsTable).where(eq(unitsTable.propertyId, params.data.id));
  const result = {
    ...property,
    totalUnits: units.length,
    occupiedUnits: units.filter((u) => u.status === "occupied").length,
  };
  res.json(UpdatePropertyResponse.parse(result));
});

router.delete("/properties/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = DeletePropertyParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(propertiesTable).where(eq(propertiesTable.id, params.data.id));
  res.sendStatus(204);
});

// Units
router.get("/properties/:id/units", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = ListUnitsParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const units = await db
    .select({
      id: unitsTable.id,
      propertyId: unitsTable.propertyId,
      propertyName: propertiesTable.name,
      unitNumber: unitsTable.unitNumber,
      floor: unitsTable.floor,
      bedrooms: unitsTable.bedrooms,
      bathrooms: unitsTable.bathrooms,
      rentAmount: unitsTable.rentAmount,
      status: unitsTable.status,
      createdAt: unitsTable.createdAt,
    })
    .from(unitsTable)
    .leftJoin(propertiesTable, eq(unitsTable.propertyId, propertiesTable.id))
    .where(eq(unitsTable.propertyId, params.data.id));

  const parsed = units.map((u) => ({
    ...u,
    bathrooms: parseFloat(u.bathrooms),
    rentAmount: parseFloat(u.rentAmount),
  }));
  res.json(ListUnitsResponse.parse(parsed));
});

router.get("/units", async (_req, res): Promise<void> => {
  const units = await db
    .select({
      id: unitsTable.id,
      propertyId: unitsTable.propertyId,
      propertyName: propertiesTable.name,
      unitNumber: unitsTable.unitNumber,
      floor: unitsTable.floor,
      bedrooms: unitsTable.bedrooms,
      bathrooms: unitsTable.bathrooms,
      rentAmount: unitsTable.rentAmount,
      status: unitsTable.status,
      createdAt: unitsTable.createdAt,
    })
    .from(unitsTable)
    .leftJoin(propertiesTable, eq(unitsTable.propertyId, propertiesTable.id))
    .orderBy(unitsTable.createdAt);

  const parsed = units.map((u) => ({
    ...u,
    bathrooms: parseFloat(u.bathrooms),
    rentAmount: parseFloat(u.rentAmount),
  }));
  res.json(ListAllUnitsResponse.parse(parsed));
});

router.post("/units", async (req, res): Promise<void> => {
  const parsed = CreateUnitBody.safeParse({
    ...req.body,
    bathrooms: String(req.body.bathrooms),
    rentAmount: String(req.body.rentAmount),
  });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [unit] = await db.insert(unitsTable).values(parsed.data).returning();
  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, unit.propertyId));
  const result = {
    ...unit,
    propertyName: property?.name ?? null,
    bathrooms: parseFloat(unit.bathrooms),
    rentAmount: parseFloat(unit.rentAmount),
  };
  res.status(201).json(result);
});

router.put("/units/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = UpdateUnitParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateUnitBody.safeParse({
    ...req.body,
    bathrooms: req.body.bathrooms != null ? String(req.body.bathrooms) : undefined,
    rentAmount: req.body.rentAmount != null ? String(req.body.rentAmount) : undefined,
  });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [unit] = await db.update(unitsTable).set(parsed.data).where(eq(unitsTable.id, params.data.id)).returning();
  if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }

  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, unit.propertyId));
  const result = {
    ...unit,
    propertyName: property?.name ?? null,
    bathrooms: parseFloat(unit.bathrooms),
    rentAmount: parseFloat(unit.rentAmount),
  };
  res.json(UpdateUnitResponse.parse(result));
});

router.delete("/units/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const params = DeleteUnitParams.safeParse({ id });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(unitsTable).where(eq(unitsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
