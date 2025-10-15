import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertScheduleSchema, 
  insertJobSchema, 
  insertLiftOfferSchema, 
  insertLiftRequestSchema,
  insertMessageSchema 
} from "@shared/schema";

const updateScheduleSchema = insertScheduleSchema.partial();
const updateJobSchema = insertJobSchema.partial();

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/schedules", async (req, res) => {
    try {
      const validatedData = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(validatedData);
      res.json(schedule);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid schedule data", details: error });
      }
      console.error("Create schedule error:", error);
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  app.get("/api/schedules/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const schedules = await storage.getSchedulesByUserId(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({ error: "Failed to get schedules" });
    }
  });

  app.get("/api/schedules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const schedule = await storage.getSchedule(id);
      
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      res.json(schedule);
    } catch (error) {
      console.error("Get schedule error:", error);
      res.status(500).json({ error: "Failed to get schedule" });
    }
  });

  app.patch("/api/schedules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedUpdates = updateScheduleSchema.parse(req.body);
      
      const updatedSchedule = await storage.updateSchedule(id, validatedUpdates);
      
      if (!updatedSchedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      res.json(updatedSchedule);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid update data", details: error });
      }
      console.error("Update schedule error:", error);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  app.delete("/api/schedules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSchedule(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete schedule error:", error);
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const validatedData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(validatedData);
      res.json(job);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid job data", details: error });
      }
      console.error("Create job error:", error);
      res.status(500).json({ error: "Failed to create job" });
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

  app.get("/api/jobs/schedule/:scheduleId", async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const jobs = await storage.getJobsByScheduleId(scheduleId);
      res.json(jobs);
    } catch (error) {
      console.error("Get jobs error:", error);
      res.status(500).json({ error: "Failed to get jobs" });
    }
  });

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

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedUpdates = updateJobSchema.parse(req.body);
      
      const updatedJob = await storage.updateJob(id, validatedUpdates);
      
      if (!updatedJob) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json(updatedJob);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid update data", details: error });
      }
      console.error("Update job error:", error);
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteJob(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete job error:", error);
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  app.post("/api/lift-offers", async (req, res) => {
    try {
      const validatedData = insertLiftOfferSchema.parse(req.body);
      const offer = await storage.createLiftOffer(validatedData);
      res.json(offer);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid lift offer data", details: error });
      }
      console.error("Create lift offer error:", error);
      res.status(500).json({ error: "Failed to create lift offer" });
    }
  });

  app.get("/api/lift-offers", async (req, res) => {
    try {
      const offers = await storage.getAllLiftOffers();
      res.json(offers);
    } catch (error) {
      console.error("Get lift offers error:", error);
      res.status(500).json({ error: "Failed to get lift offers" });
    }
  });

  app.get("/api/lift-offers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const offer = await storage.getLiftOffer(id);
      
      if (!offer) {
        return res.status(404).json({ error: "Lift offer not found" });
      }

      res.json(offer);
    } catch (error) {
      console.error("Get lift offer error:", error);
      res.status(500).json({ error: "Failed to get lift offer" });
    }
  });

  app.get("/api/lift-offers/driver/:driverId", async (req, res) => {
    try {
      const { driverId } = req.params;
      const offers = await storage.getLiftOffersByDriverId(driverId);
      res.json(offers);
    } catch (error) {
      console.error("Get driver lift offers error:", error);
      res.status(500).json({ error: "Failed to get lift offers" });
    }
  });

  app.patch("/api/lift-offers/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const validStatuses = ["available", "booked", "completed", "cancelled"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Invalid status", 
          validStatuses 
        });
      }

      const updatedOffer = await storage.updateLiftOfferStatus(id, status);
      
      if (!updatedOffer) {
        return res.status(404).json({ error: "Lift offer not found" });
      }

      res.json(updatedOffer);
    } catch (error) {
      console.error("Update lift offer error:", error);
      res.status(500).json({ error: "Failed to update lift offer" });
    }
  });

  app.delete("/api/lift-offers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteLiftOffer(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Lift offer not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete lift offer error:", error);
      res.status(500).json({ error: "Failed to delete lift offer" });
    }
  });

  app.post("/api/lift-requests", async (req, res) => {
    try {
      const validatedData = insertLiftRequestSchema.parse(req.body);
      const request = await storage.createLiftRequest(validatedData);
      res.json(request);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid lift request data", details: error });
      }
      console.error("Create lift request error:", error);
      res.status(500).json({ error: "Failed to create lift request" });
    }
  });

  app.get("/api/lift-requests", async (req, res) => {
    try {
      const requests = await storage.getAllLiftRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get lift requests error:", error);
      res.status(500).json({ error: "Failed to get lift requests" });
    }
  });

  app.get("/api/lift-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getLiftRequest(id);
      
      if (!request) {
        return res.status(404).json({ error: "Lift request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Get lift request error:", error);
      res.status(500).json({ error: "Failed to get lift request" });
    }
  });

  app.delete("/api/lift-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteLiftRequest(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Lift request not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete lift request error:", error);
      res.status(500).json({ error: "Failed to delete lift request" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid message data", details: error });
      }
      console.error("Create message error:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  app.get("/api/messages/between/:userId1/:userId2", async (req, res) => {
    try {
      const { userId1, userId2 } = req.params;
      const messages = await storage.getMessagesBetweenUsers(userId1, userId2);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.get("/api/conversations/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
