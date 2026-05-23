import { pgTable, serial, integer, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const snookerBoardsTable = pgTable("snooker_boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  coinValue: numeric("coin_value", { precision: 10, scale: 2 }).notNull().default("5.00"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const snookerSessionsTable = pgTable("snooker_sessions", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull().references(() => snookerBoardsTable.id),
  date: date("date").notNull(),
  coinsCount: integer("coins_count").notNull().default(0),
  coinTotal: numeric("coin_total", { precision: 10, scale: 2 }).notNull().default("0"),
  cashierAmount: numeric("cashier_amount", { precision: 10, scale: 2 }),
  variance: numeric("variance", { precision: 10, scale: 2 }),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSnookerBoardSchema = createInsertSchema(snookerBoardsTable).omit({ id: true, createdAt: true });
export type InsertSnookerBoard = z.infer<typeof insertSnookerBoardSchema>;
export type SnookerBoard = typeof snookerBoardsTable.$inferSelect;

export const insertSnookerSessionSchema = createInsertSchema(snookerSessionsTable).omit({ id: true, createdAt: true });
export type InsertSnookerSession = z.infer<typeof insertSnookerSessionSchema>;
export type SnookerSession = typeof snookerSessionsTable.$inferSelect;
