import { Express } from "express";
import { seedDatabase } from "./seed";

export function registerTestHelpers(app: Express) {
  if (process.env.NODE_ENV === "production") return;

  app.post("/api/test/seed-user", (req, res) => {
    const { id = "test-user", email = "test@drivernet.local", sub = "active", name = "Test User" } = req.body || {};
    (req.session as any).user = { id, email, name, subscription_status: sub };
    res.json({ ok: true, id, email, sub });
  });

  app.post("/api/test/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.post("/api/test/seed-database", async (req, res) => {
    try {
      const users = await seedDatabase();
      res.json({ 
        ok: true, 
        message: `Created ${users.length} users with delivery schedules`,
        userCount: users.length 
      });
    } catch (error) {
      res.status(500).json({ 
        ok: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
}
