import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bikesTable = pgTable("bikes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBikeSchema = createInsertSchema(bikesTable).omit({ id: true, createdAt: true });
export type InsertBike = z.infer<typeof insertBikeSchema>;
export type Bike = typeof bikesTable.$inferSelect;
