import { Router } from "express";
import { db } from "@workspace/db";
import {
  reservationsTable,
  queueEntriesTable,
  participantsTable,
  songsTable,
} from "@workspace/db";
import { eq, and, inArray, max, gt, sql } from "drizzle-orm";
import { CreateReservationBody } from "@workspace/api-zod";

const router = Router();

router.post("/sessions/:sessionId/reservations", async (req, res) => {
  const { sessionId } = req.params;
  const parsed = CreateReservationBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const cpf = parsed.data.cpf;

  // Validate CPF: 11 digits, all-same is invalid
  if (!/^\d{11}$/.test(cpf)) return res.status(400).json({ error: "CPF inválido" });
  if (/^(\d)\1{10}$/.test(cpf)) return res.status(400).json({ error: "CPF inválido" });

  // Upsert participant
  let participant = (
    await db.select().from(participantsTable).where(eq(participantsTable.cpf, cpf))
  )[0];
  if (!participant) {
    [participant] = await db
      .insert(participantsTable)
      .values({ cpf, name: parsed.data.name })
      .returning();
  }

  // Check 1-active-reservation rule
  const activeReservations = await db
    .select()
    .from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.sessionId, sessionId),
        eq(reservationsTable.participantId, participant.id),
        inArray(reservationsTable.status, ["QUEUED", "PLAYING"])
      )
    );

  if (activeReservations.length > 0) {
    return res.status(400).json({ error: "Você já tem uma música na fila. Aguarde o término para reservar novamente." });
  }

  // Upsert song
  let song = (
    await db.select().from(songsTable).where(eq(songsTable.youtubeId, parsed.data.youtubeId))
  )[0];
  if (!song) {
    [song] = await db
      .insert(songsTable)
      .values({
        youtubeId: parsed.data.youtubeId,
        title: parsed.data.title,
        channelName: parsed.data.channelName,
        thumbnailUrl: parsed.data.thumbnailUrl,
      })
      .returning();
  }

  // Create reservation
  const [reservation] = await db
    .insert(reservationsTable)
    .values({
      sessionId,
      participantId: participant.id,
      songId: song.id,
      status: "QUEUED",
    })
    .returning();

  // Get max position in current queue
  const [maxPos] = await db
    .select({ max: max(queueEntriesTable.position) })
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.sessionId, sessionId));

  const newPosition = (maxPos.max ?? 0) + 1;

  const [entry] = await db
    .insert(queueEntriesTable)
    .values({
      sessionId,
      reservationId: reservation.id,
      position: newPosition,
    })
    .returning();

  return res.status(201).json({
    ...entry,
    reservation: { ...reservation, participant, song },
  });
});

router.delete("/sessions/:sessionId/reservations/:reservationId/cancel", async (req, res) => {
  const { sessionId, reservationId } = req.params;
  const { cpf } = req.body as { cpf?: string };

  if (!cpf) return res.status(400).json({ error: "CPF obrigatório" });

  const [reservation] = await db
    .select()
    .from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.id, reservationId),
        eq(reservationsTable.sessionId, sessionId)
      )
    );

  if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });
  if (reservation.status !== "QUEUED") {
    return res.status(400).json({ error: "Só é possível cancelar reservas com status QUEUED" });
  }

  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.id, reservation.participantId));

  if (!participant || participant.cpf !== cpf) {
    return res.status(400).json({ error: "CPF não corresponde à reserva" });
  }

  const [entry] = await db
    .select()
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.reservationId, reservationId));

  if (entry) {
    await db.delete(queueEntriesTable).where(eq(queueEntriesTable.id, entry.id));
    await db
      .update(queueEntriesTable)
      .set({ position: sql`${queueEntriesTable.position} - 1` })
      .where(
        and(
          eq(queueEntriesTable.sessionId, sessionId),
          gt(queueEntriesTable.position, entry.position)
        )
      );
  }

  const [updated] = await db
    .update(reservationsTable)
    .set({ status: "CANCELLED", cancelledAt: new Date() })
    .where(eq(reservationsTable.id, reservationId))
    .returning();

  const [song] = await db.select().from(songsTable).where(eq(songsTable.id, updated.songId));

  return res.json({ ...updated, participant, song });
});

router.get("/sessions/:sessionId/reservations/by-cpf/:cpf", async (req, res) => {
  const { sessionId, cpf } = req.params;

  const participant = (
    await db.select().from(participantsTable).where(eq(participantsTable.cpf, cpf))
  )[0];

  if (!participant) return res.json([]);

  const reservations = await db
    .select()
    .from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.sessionId, sessionId),
        eq(reservationsTable.participantId, participant.id)
      )
    )
    .orderBy(reservationsTable.requestedAt);

  const withRelations = await Promise.all(
    reservations.map(async (r) => {
      const [song] = await db.select().from(songsTable).where(eq(songsTable.id, r.songId));
      return { ...r, participant, song };
    })
  );

  return res.json(withRelations);
});

export default router;
