import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, reservationsTable, queueEntriesTable, participantsTable } from "@workspace/db";
import { eq, and, inArray, count, countDistinct } from "drizzle-orm";
import { CreateSessionBody, UpdateSessionStatusBody } from "@workspace/api-zod";

const router = Router();

router.get("/sessions", async (req, res) => {
  const sessions = await db.select().from(sessionsTable).orderBy(sessionsTable.createdAt);
  res.json(sessions);
});

router.post("/sessions", async (req, res) => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [session] = await db.insert(sessionsTable).values({ name: parsed.data.name }).returning();
  res.status(201).json(session);
});

router.get("/sessions/active", async (req, res) => {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(inArray(sessionsTable.status, ["OPEN", "PAUSED"]))
    .orderBy(sessionsTable.openedAt)
    .limit(1);

  if (!session) return res.status(404).json({ error: "No active session" });
  res.json(session);
});

router.get("/sessions/:sessionId", async (req, res) => {
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.sessionId));
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

router.patch("/sessions/:sessionId/status", async (req, res) => {
  const parsed = UpdateSessionStatusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status" });

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, req.params.sessionId));
  if (!session) return res.status(404).json({ error: "Session not found" });

  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "CLOSED") updates.closedAt = new Date();

  const [updated] = await db
    .update(sessionsTable)
    .set(updates)
    .where(eq(sessionsTable.id, req.params.sessionId))
    .returning();

  res.json(updated);
});

router.get("/sessions/:sessionId/summary", async (req, res) => {
  const { sessionId } = req.params;

  const [totalRows] = await db
    .select({ count: count() })
    .from(reservationsTable)
    .where(eq(reservationsTable.sessionId, sessionId));

  const [participantRows] = await db
    .select({ count: countDistinct(reservationsTable.participantId) })
    .from(reservationsTable)
    .where(eq(reservationsTable.sessionId, sessionId));

  const statusCounts = await db
    .select({ status: reservationsTable.status, count: count() })
    .from(reservationsTable)
    .where(eq(reservationsTable.sessionId, sessionId))
    .groupBy(reservationsTable.status);

  const byStatus: Record<string, number> = {};
  for (const row of statusCounts) byStatus[row.status] = Number(row.count);

  res.json({
    sessionId,
    totalReservations: Number(totalRows.count),
    totalParticipants: Number(participantRows.count),
    completed: byStatus["FINISHED"] || 0,
    skipped: byStatus["SKIPPED"] || 0,
    removed: byStatus["REMOVED"] || 0,
    queued: (byStatus["QUEUED"] || 0) + (byStatus["PLAYING"] || 0),
  });
});

export default router;
