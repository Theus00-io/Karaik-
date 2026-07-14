import type { NextFunction, Request, Response } from "express";

type Counter = { count: number; resetAt: number };

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const counters = new Map<string, Counter>();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, counter] of counters) {
      if (counter.resetAt <= now) counters.delete(key);
    }
  }, options.windowMs);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = counters.get(key);
    const counter =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + options.windowMs }
        : current;
    counter.count += 1;
    counters.set(key, counter);

    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - counter.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(counter.resetAt / 1000)));

    if (counter.count > options.max) {
      res.setHeader("Retry-After", String(Math.ceil((counter.resetAt - now) / 1000)));
      res.status(429).json({ error: options.message ?? "Too many requests" });
      return;
    }
    next();
  };
}

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://i.ytimg.com https://img.youtube.com",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "connect-src 'self' https://www.googleapis.com",
      "upgrade-insecure-requests",
    ].join("; "),
  );
  next();
}

export function requireTrustedOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  const allowed = process.env.APP_ORIGIN || requestOrigin;
  if (origin && origin !== allowed) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  next();
}
