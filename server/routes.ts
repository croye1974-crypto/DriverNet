import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/jobs/:id/check-in", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.status !== "pending") {
        return res.status(400).json({ error: "Job is not in pending status" });
      }

      const updatedJob = await storage.updateJobStatus(
        id,
        "in-progress",
        new Date()
      );

      res.json(updatedJob);
    } catch (error) {
      console.error("Check-in error:", error);
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  app.post("/api/jobs/:id/check-out", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.status !== "in-progress") {
        return res.status(400).json({ error: "Job is not in progress" });
      }

      const updatedJob = await storage.updateJobStatus(
        id,
        "completed",
        undefined,
        new Date()
      );

      res.json(updatedJob);
    } catch (error) {
      console.error("Check-out error:", error);
      res.status(500).json({ error: "Failed to check out" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Get job error:", error);
      res.status(500).json({ error: "Failed to get job" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
