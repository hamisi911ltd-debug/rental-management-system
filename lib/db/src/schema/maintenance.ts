import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { unitsTable } from "./properties";

export const maintenanceTicketsTable = pgTable("maintenance_tickets", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id, { onDelete: "set null" }),
  unitId: integer("unit_id").references(() => unitsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  category: text("category").notNull().default("other"),
  assignedTo: text("assigned_to"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMaintenanceTicketSchema = createInsertSchema(maintenanceTicketsTable).omit({ id: true, createdAt: true, resolvedAt: true });
export type InsertMaintenanceTicket = z.infer<typeof insertMaintenanceTicketSchema>;
export type MaintenanceTicket = typeof maintenanceTicketsTable.$inferSelect;
