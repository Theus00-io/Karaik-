import { Router } from "express";
import { db } from "@workspace/db";
import { participantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateParticipantBody } from "@workspace/api-zod";
import { requireOperator } from "../lib/auth";

const router = Router();

router.get("/participants/by-cpf/:cpf", requireOperator, async (req, res) => {
  const [participant] = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.cpf, req.params.cpf));

  if (!participant) return res.status(404).json({ error: "Participant not found" });
  res.json(participant);
});

router.post("/participants", async (req, res) => {
  const parsed = CreateParticipantBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const existing = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.cpf, parsed.data.cpf));

  if (existing.length > 0) return res.status(409).json({ error: "CPF already registered" });

  const [participant] = await db.insert(participantsTable).values(parsed.data).returning();
  res.status(201).json(participant);
});

export default router;
