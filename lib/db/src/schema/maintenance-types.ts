import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const maintenanceTypesTable = pgTable("maintenance_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceTypeSchema = createInsertSchema(maintenanceTypesTable).omit({ id: true, createdAt: true });
export type InsertMaintenanceType = z.infer<typeof insertMaintenanceTypeSchema>;
export type MaintenanceType = typeof maintenanceTypesTable.$inferSelect;
