import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";
import { participantsTable } from "./participants";
import { songsTable } from "./songs";

export const reservationStatusEnum = pgEnum("reservation_status", ["QUEUED", "PLAYING", "FINISHED", "SKIPPED", "REMOVED"]);

export const reservationsTable = pgTable("reservations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull().references(() => sessionsTable.id),
  participantId: text("participant_id").notNull().references(() => participantsTable.id),
  songId: text("song_id").notNull().references(() => songsTable.id),
  status: reservationStatusEnum("status").notNull().default("QUEUED"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  skippedAt: timestamp("skipped_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
});

export const insertReservationSchema = createInsertSchema(reservationsTable).omit({ id: true, requestedAt: true, startedAt: true, finishedAt: true, skippedAt: true, removedAt: true });
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservationsTable.$inferSelect;
