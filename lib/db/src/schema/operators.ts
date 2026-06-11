import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const operatorsTable = pgTable("operators", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOperatorSchema = createInsertSchema(operatorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOperator = z.infer<typeof insertOperatorSchema>;
export type Operator = typeof operatorsTable.$inferSelect;
