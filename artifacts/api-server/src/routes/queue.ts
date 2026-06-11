import { Router } from "express";
import { db } from "@workspace/db";
import {
  queueEntriesTable,
  reservationsTable,
  participantsTable,
  songsTable,
} from "@workspace/db";
import { eq, asc, and, gt, sql } from "drizzle-orm";

const router = Router();

async function buildQueueEntry(entry: typeof queueEntriesTable.$inferSelect) {
  const [reservation] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.id, entry.reservationId));
  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.id, reservation.participantId));
  const [song] = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.id, reservation.songId));

  return { ...entry, reservation: { ...reservation, participant, song } };
}

router.get("/sessions/:sessionId/queue", async (req, res) => {
  const { sessionId } = req.params;

  const entries = await db
    .select()
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.sessionId, sessionId))
    .orderBy(asc(queueEntriesTable.position));

  const withRelations = await Promise.all(entries.map(buildQueueEntry));
  res.json(withRelations);
});

router.post("/queue-entries/:entryId/play", async (req, res) => {
  const { entryId } = req.params;

  const [entry] = await db
    .select()
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.id, entryId));
  if (!entry) return res.status(404).json({ error: "Entry not found" });

  const [reservation] = await db
    .update(reservationsTable)
    .set({ status: "PLAYING", startedAt: new Date() })
    .where(eq(reservationsTable.id, entry.reservationId))
    .returning();

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.id, reservation.participantId));
  const [song] = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.id, reservation.songId));

  res.json({ ...reservation, participant, song });
});

router.post("/queue-entries/:entryId/finish", async (req, res) => {
  const { entryId } = req.params;

  const [entry] = await db
    .select()
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.id, entryId));
  if (!entry) return res.status(404).json({ error: "Entry not found" });

  await db.delete(queueEntriesTable).where(eq(queueEntriesTable.id, entryId));

  // Compact positions in the session
  await recompactPositions(entry.sessionId, entry.position);

  const [reservation] = await db
    .update(reservationsTable)
    .set({ status: "FINISHED", finishedAt: new Date() })
    .where(eq(reservationsTable.id, entry.reservationId))
    .returning();

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.id, reservation.participantId));
  const [song] = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.id, reservation.songId));

  res.json({ ...reservation, participant, song });
});

router.post("/queue-entries/:entryId/skip", async (req, res) => {
  const { entryId } = req.params;

  const [entry] = await db
    .select()
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.id, entryId));
  if (!entry) return res.status(404).json({ error: "Entry not found" });

  await db.delete(queueEntriesTable).where(eq(queueEntriesTable.id, entryId));
  await recompactPositions(entry.sessionId, entry.position);

  const [reservation] = await db
    .update(reservationsTable)
    .set({ status: "SKIPPED", skippedAt: new Date() })
    .where(eq(reservationsTable.id, entry.reservationId))
    .returning();

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.id, reservation.participantId));
  const [song] = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.id, reservation.songId));

  res.json({ ...reservation, participant, song });
});

router.delete("/queue-entries/:entryId/remove", async (req, res) => {
  const { entryId } = req.params;

  const [entry] = await db
    .select()
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.id, entryId));
  if (!entry) return res.status(404).json({ error: "Entry not found" });

  await db.delete(queueEntriesTable).where(eq(queueEntriesTable.id, entryId));
  await recompactPositions(entry.sessionId, entry.position);

  const [reservation] = await db
    .update(reservationsTable)
    .set({ status: "REMOVED", removedAt: new Date() })
    .where(eq(reservationsTable.id, entry.reservationId))
    .returning();

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.id, reservation.participantId));
  const [song] = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.id, reservation.songId));

  res.json({ ...reservation, participant, song });
});

async function recompactPositions(sessionId: string, fromPosition: number) {
  await db
    .update(queueEntriesTable)
    .set({ position: sql`${queueEntriesTable.position} - 1` })
    .where(
      and(
        eq(queueEntriesTable.sessionId, sessionId),
        gt(queueEntriesTable.position, fromPosition)
      )
    );
}

export default router;
