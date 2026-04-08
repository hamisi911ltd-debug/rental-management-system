import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { unitsTable } from "./properties";

export const leasesTable = pgTable("leases", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "restrict" }),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "restrict" }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  monthlyRent: text("monthly_rent").notNull(),
  deposit: text("deposit").notNull().default("0"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeaseSchema = createInsertSchema(leasesTable).omit({ id: true, createdAt: true });
export type InsertLease = z.infer<typeof insertLeaseSchema>;
export type Lease = typeof leasesTable.$inferSelect;
