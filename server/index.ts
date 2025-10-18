import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import pgSession from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./routes/auth";
import { registerStripeRoutes } from "./routes/stripe";
import { registerTestHelpers } from "./test-helper";
import { setupVite, serveStatic, log } from "./vite";

// ------------------------------------
// ✅ 1. Create app + core middleware
// ------------------------------------
const app = express();
app.set("trust proxy", 1); // Required for secure cookies on Replit or proxies

app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false,
  })
);
app.use(compression());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL || false
        : true,
    credentials: true,
  })
);

// Stripe webhook raw body
app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json", limit: "500kb" })
);

// Normal body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// ------------------------------------
// ✅ 2. Session store (Memory for dev / Postgres for prod)
// ------------------------------------
const MemStore = MemoryStore(session);
const PgSession = pgSession(session);

const sessionStore =
  process.env.NODE_ENV === "production" && process.env.DATABASE_URL
    ? new PgSession({ conString: process.env.DATABASE_URL })
    : new MemStore({ checkPeriod: 86_400_000 });

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: "dn.sid",
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// ------------------------------------
// ✅ 2.5. Test helpers (dev only)
// ------------------------------------
registerTestHelpers(app);

// ------------------------------------
// ✅ 3. Rate limiters
// ------------------------------------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: "Too many login attempts, please try again later.",
});
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
});

app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/stripe/webhook", webhookLimiter);

// ------------------------------------
// ✅ 4. Request logging (trim long responses)
// ------------------------------------
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any;
  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          const snippet = JSON.stringify(capturedJsonResponse);
          line += ` :: ${snippet.length > 150 ? snippet.slice(0, 150) + "…" : snippet}`;
        } catch {}
      }
      log(line);
    }
  });
  next();
});

// ------------------------------------
// ✅ 5. Routes + error handling
// ------------------------------------
(async () => {
  registerAuthRoutes(app);
  registerStripeRoutes(app);
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error ${status}: ${message}`);
    if (process.env.NODE_ENV !== "production" && err.stack) log(err.stack);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => log(`✅ DriveNet running on port ${port}`)
  );
})();
