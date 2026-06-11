import { Router } from "express";
import { db } from "@workspace/db";
import { operatorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { OperatorLoginBody } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

// In-memory session store: sessionToken → operatorId
const sessions = new Map<string, string>();

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

export function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(attempt, "hex"), Buffer.from(hash, "hex"));
}

router.post("/operators/login", async (req, res) => {
  const parsed = OperatorLoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [operator] = await db
    .select()
    .from(operatorsTable)
    .where(eq(operatorsTable.username, parsed.data.username));

  if (!operator) return res.status(401).json({ error: "Credenciais inválidas" });

  const valid = verifyPassword(parsed.data.password, operator.passwordHash);
  if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

  const token = crypto.randomUUID();
  sessions.set(token, operator.id);

  res.cookie("op_session", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });

  res.json({ id: operator.id, username: operator.username, displayName: operator.displayName });
});

router.post("/operators/logout", (req, res) => {
  const token = req.cookies?.op_session;
  if (token) sessions.delete(token);
  res.clearCookie("op_session");
  res.json({ ok: true });
});

router.get("/operators/me", async (req, res) => {
  const token = req.cookies?.op_session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const operatorId = sessions.get(token);
  if (!operatorId) return res.status(401).json({ error: "Session expired" });

  const [operator] = await db
    .select()
    .from(operatorsTable)
    .where(eq(operatorsTable.id, operatorId));

  if (!operator) return res.status(401).json({ error: "Operator not found" });

  res.json({ id: operator.id, username: operator.username, displayName: operator.displayName });
});

export { sessions };
export default router;
