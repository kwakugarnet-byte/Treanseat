import { pgTable, serial, integer, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { maintenanceTypesTable } from "./maintenance-types";

export const snookerBoardsTable = pgTable("snooker_boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  coinValue: numeric("coin_value", { precision: 10, scale: 2 }).notNull().default("5.00"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const snookerSessionsTable = pgTable("snooker_sessions", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => snookerBoardsTable.id),
  date: date("date").notNull(),
  coinsCount: integer("coins_count").notNull().default(0),
  coinTotal: numeric("coin_total", { precision: 10, scale: 2 }).notNull().default("0"),
  cashierAmount: numeric("cashier_amount", { precision: 10, scale: 2 }),
  variance: numeric("variance", { precision: 10, scale: 2 }),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const snookerMaintenanceTable = pgTable("snooker_maintenance", {
  id: serial("id").primaryKey(),
  typeId: integer("type_id").references(() => maintenanceTypesTable.id),
  date: date("date").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const snookerWorkersTable = pgTable("snooker_workers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  monthlySalary: numeric("monthly_salary", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSnookerBoardSchema = createInsertSchema(snookerBoardsTable).omit({ id: true, createdAt: true });
export type InsertSnookerBoard = z.infer<typeof insertSnookerBoardSchema>;
export type SnookerBoard = typeof snookerBoardsTable.$inferSelect;

export const insertSnookerSessionSchema = createInsertSchema(snookerSessionsTable).omit({ id: true, createdAt: true });
export type InsertSnookerSession = z.infer<typeof insertSnookerSessionSchema>;
export type SnookerSession = typeof snookerSessionsTable.$inferSelect;

export const insertSnookerMaintenanceSchema = createInsertSchema(snookerMaintenanceTable).omit({ id: true, createdAt: true });
export type InsertSnookerMaintenance = z.infer<typeof insertSnookerMaintenanceSchema>;
export type SnookerMaintenance = typeof snookerMaintenanceTable.$inferSelect;

export const insertSnookerWorkerSchema = createInsertSchema(snookerWorkersTable).omit({ id: true, createdAt: true });
export type InsertSnookerWorker = z.infer<typeof insertSnookerWorkerSchema>;
export type SnookerWorker = typeof snookerWorkersTable.$inferSelect;
