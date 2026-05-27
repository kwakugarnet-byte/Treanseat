import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bikesTable } from "./bikes";

export const ridersTable = pgTable("riders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  phone: text("phone").notNull(),
  emergencyContactName: text("emergency_contact_name").notNull(),
  emergencyContactPhone: text("emergency_contact_phone").notNull(),
  emergencyContactAge: integer("emergency_contact_age").notNull(),
  bikeId: integer("bike_id").notNull().references(() => bikesTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRiderSchema = createInsertSchema(ridersTable).omit({ id: true, createdAt: true });
export type InsertRider = z.infer<typeof insertRiderSchema>;
export type Rider = typeof ridersTable.$inferSelect;
