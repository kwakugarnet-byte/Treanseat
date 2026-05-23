import { pgTable, serial, integer, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bikesTable } from "./bikes";

export const maintenanceTable = pgTable("maintenance", {
  id: serial("id").primaryKey(),
  bikeId: integer("bike_id").notNull().references(() => bikesTable.id),
  date: date("date").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceSchema = createInsertSchema(maintenanceTable).omit({ id: true, createdAt: true });
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type MaintenanceRecord = typeof maintenanceTable.$inferSelect;
