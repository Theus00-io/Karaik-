import { pgTable, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";
import { reservationsTable } from "./reservations";

export const queueEntriesTable = pgTable("queue_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull().references(() => sessionsTable.id),
  reservationId: text("reservation_id").notNull().unique().references(() => reservationsTable.id),
  position: integer("position").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("queue_entries_session_position_unique").on(t.sessionId, t.position),
  index("queue_entries_session_position_idx").on(t.sessionId, t.position),
]);

export const insertQueueEntrySchema = createInsertSchema(queueEntriesTable).omit({ id: true, addedAt: true });
export type InsertQueueEntry = z.infer<typeof insertQueueEntrySchema>;
export type QueueEntry = typeof queueEntriesTable.$inferSelect;
