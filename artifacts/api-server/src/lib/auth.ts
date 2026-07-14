import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const COOKIE_NAME = "op_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must contain at least 32 characters in production.");
  }
  return "development-only-secret-change-before-production";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSessionToken(operatorId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ operatorId, expiresAt: Date.now() + SESSION_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { operatorId?: unknown; expiresAt?: unknown };
    if (
      typeof decoded.operatorId !== "string" ||
      typeof decoded.expiresAt !== "number" ||
      decoded.expiresAt <= Date.now()
    ) {
      return null;
    }
    return decoded.operatorId;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

export function requireOperator(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const operatorId = verifySessionToken(req.cookies?.[COOKIE_NAME]);
  if (!operatorId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.locals.operatorId = operatorId;
  next();
}
