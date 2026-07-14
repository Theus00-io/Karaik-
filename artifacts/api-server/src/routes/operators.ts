import { Router } from "express";
import { db, operatorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { OperatorLoginBody } from "@workspace/api-zod";
import crypto from "node:crypto";
import { promisify } from "node:util";
import {
  clearSessionCookie,
  createSessionToken,
  requireOperator,
  setSessionCookie,
} from "../lib/auth";
import { createRateLimiter } from "../middlewares/security";

const router = Router();
const scrypt = promisify(crypto.scrypt);
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 8,
  message: "Muitas tentativas de login. Tente novamente mais tarde.",
});

export async function ensureInitialOperator(): Promise<void> {
  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || "Operador";

  const [existing] = await db
    .select({ id: operatorsTable.id })
    .from(operatorsTable)
    .where(eq(operatorsTable.username, username));
  if (existing) return;

  if (!password || password.length < 12) {
    throw new Error(
      "ADMIN_PASSWORD must contain at least 12 characters to create the initial operator.",
    );
  }

  await db.insert(operatorsTable).values({
    username,
    displayName,
    passwordHash: await hashPassword(password),
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  let expected: Buffer;
  let actual: Buffer;

  if (parts.length === 3 && parts[0] === "scrypt") {
    expected = Buffer.from(parts[2] ?? "", "hex");
    actual = (await scrypt(password, parts[1] ?? "", expected.length)) as Buffer;
  } else if (parts.length === 2) {
    expected = Buffer.from(parts[1] ?? "", "hex");
    actual = crypto.pbkdf2Sync(password, parts[0] ?? "", 100_000, 64, "sha512");
  } else {
    return false;
  }

  return expected.length > 0 && expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

router.post("/operators/login", loginLimiter, async (req, res) => {
  const parsed = OperatorLoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [operator] = await db
    .select()
    .from(operatorsTable)
    .where(eq(operatorsTable.username, parsed.data.username));

  const valid = operator ? await verifyPassword(parsed.data.password, operator.passwordHash) : false;
  if (!operator || !valid) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  setSessionCookie(res, createSessionToken(operator.id));
  res.json({
    id: operator.id,
    username: operator.username,
    displayName: operator.displayName,
  });
});

router.post("/operators/logout", requireOperator, (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/operators/me", requireOperator, async (_req, res) => {
  const [operator] = await db
    .select()
    .from(operatorsTable)
    .where(eq(operatorsTable.id, res.locals.operatorId as string));

  if (!operator) return res.status(401).json({ error: "Session expired" });
  res.json({
    id: operator.id,
    username: operator.username,
    displayName: operator.displayName,
  });
});

export default router;
