import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  createRateLimiter,
  requireTrustedOrigin,
  securityHeaders,
} from "./middlewares/security";

const app: Express = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);
if (process.env.APP_ORIGIN) {
  app.use(cors({ origin: process.env.APP_ORIGIN, credentials: true }));
}
app.use(createRateLimiter({ windowMs: 60_000, max: 180 }));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use(cookieParser());
app.use(requireTrustedOrigin);

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.resolve(dirname, "../../karaoke-queue/dist/public");
  app.use(
    express.static(publicDir, {
      index: false,
      maxAge: "1y",
      immutable: true,
      setHeaders(res, assetPath) {
        if (assetPath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (/\.(?:xml|txt)$/.test(assetPath)) {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    }),
  );
  app.get("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log.error({ err }, "Unhandled request error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
