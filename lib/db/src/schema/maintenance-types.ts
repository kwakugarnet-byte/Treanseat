import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const maintenanceTypesTable = pgTable("maintenance_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  frequencyDays: integer("frequency_days").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceTypeSchema = createInsertSchema(maintenanceTypesTable).omit({ id: true, createdAt: true });
export type InsertMaintenanceType = z.infer<typeof insertMaintenanceTypeSchema>;
export type MaintenanceType = typeof maintenanceTypesTable.$inferSelect;
