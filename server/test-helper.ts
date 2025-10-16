import { Express } from "express";

export function registerTestHelpers(app: Express) {
  if (process.env.NODE_ENV === "production") return;

  app.post("/api/test/seed-user", (req, res) => {
    const { id = "test-user", email = "test@drivenet.local", sub = "active", name = "Test User" } = req.body || {};
    (req.session as any).user = { id, email, name, subscription_status: sub };
    res.json({ ok: true, id, email, sub });
  });

  app.post("/api/test/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });
}
