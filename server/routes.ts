import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertScheduleSchema, 
  insertJobSchema, 
  insertLiftOfferSchema, 
  insertLiftRequestSchema,
  insertMessageSchema,
  insertRatingSchema 
} from "@shared/schema";
import { z } from "zod";

const updateScheduleSchema = insertScheduleSchema.partial();
const updateJobSchema = insertJobSchema.partial();
const checkInOutSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
const findMatchesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  maxDistanceKm: z.number().positive().max(160).optional().default(16.09),
  hoursAgo: z.number().positive().max(168).optional().default(24),
});

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
      
      // Check for matching schedules (within 3km and 60 minutes)
      const matches = await storage.findMatchingSchedules(job.id, 3, 60);
      
      if (matches.length > 0) {
        // Get the schedule and user for the new job
        const schedule = await storage.getSchedule(job.scheduleId);
        if (schedule) {
          const currentUser = await storage.getUser(schedule.userId);
          
          // Create system messages and send WebSocket notifications for each match
          for (const match of matches) {
            const time = new Date(job.estimatedEndTime).toLocaleTimeString('en-GB', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            await storage.createScheduleMatchMessage(
              schedule.userId,
              match.scheduleUserId,
              job.toLocation,
              time,
              match.distance
            );

            // Broadcast WebSocket notification to both drivers
            if (currentUser) {
              (app as any).broadcastNotification({
                type: 'schedule-match',
                userId: schedule.userId,
                matchedWith: match.userName,
                matchedUserId: match.scheduleUserId,
                location: job.toLocation,
                time,
                distance: match.distance,
                message: `Schedule match! You'll both be near ${job.toLocation} around ${time}`,
              });

              (app as any).broadcastNotification({
                type: 'schedule-match',
                userId: match.scheduleUserId,
                matchedWith: currentUser.name,
                matchedUserId: schedule.userId,
                location: job.toLocation,
                time,
                distance: match.distance,
                message: `Schedule match! You'll both be near ${job.toLocation} around ${time}`,
              });
            }
          }
        }
      }
      
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
      const { lat, lng } = checkInOutSchema.parse(req.body);
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
        new Date(),
        undefined,
        lat,
        lng
      );

      if (!updatedJob) {
        return res.status(500).json({ error: "Failed to update job status" });
      }

      // Broadcast check-in notification to all connected clients
      const schedule = await storage.getSchedule(job.scheduleId);
      if (schedule) {
        const driver = await storage.getUser(schedule.userId);
        if (driver) {
          (app as any).broadcastNotification({
            type: 'driver-check-in',
            driverId: driver.id,
            driverName: driver.name,
            jobId: updatedJob.id,
            location: updatedJob.fromLocation,
            lat,
            lng,
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.json(updatedJob);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid location data", details: error });
      }
      console.error("Check-in error:", error);
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  app.post("/api/jobs/:id/check-out", async (req, res) => {
    try {
      const { id } = req.params;
      const { lat, lng } = checkInOutSchema.parse(req.body);
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
        new Date(),
        undefined,
        undefined,
        lat,
        lng
      );

      if (!updatedJob) {
        return res.status(500).json({ error: "Failed to update job status" });
      }

      // Broadcast check-out notification to all connected clients
      const schedule = await storage.getSchedule(job.scheduleId);
      if (schedule) {
        const driver = await storage.getUser(schedule.userId);
        if (driver) {
          (app as any).broadcastNotification({
            type: 'driver-check-out',
            driverId: driver.id,
            driverName: driver.name,
            jobId: updatedJob.id,
            location: updatedJob.toLocation,
            lat,
            lng,
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.json(updatedJob);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid location data", details: error });
      }
      console.error("Check-out error:", error);
      res.status(500).json({ error: "Failed to check out" });
    }
  });

  app.get("/api/jobs/recent-check-ins", async (req, res) => {
    try {
      const hoursAgo = parseInt(req.query.hours as string) || 4;
      const jobs = await storage.getRecentCheckIns(hoursAgo);
      
      // Get user details for each job
      const jobsWithDrivers = await Promise.all(
        jobs.map(async (job) => {
          const schedule = await storage.getSchedule(job.scheduleId);
          if (!schedule) return null;
          
          const driver = await storage.getUser(schedule.userId);
          if (!driver) return null;
          
          return {
            jobId: job.id,
            driverId: driver.id,
            driverName: driver.name,
            callSign: driver.callSign,
            fromLocation: job.fromLocation,
            toLocation: job.toLocation,
            checkInLat: job.checkInLat,
            checkInLng: job.checkInLng,
            checkOutLat: job.checkOutLat,
            checkOutLng: job.checkOutLng,
            status: job.status,
            actualStartTime: job.actualStartTime,
            actualEndTime: job.actualEndTime,
          };
        })
      );
      
      // Filter out null values
      const validJobs = jobsWithDrivers.filter(job => job !== null);
      
      res.json(validJobs);
    } catch (error) {
      console.error("Get recent check-ins error:", error);
      res.status(500).json({ error: "Failed to get recent check-ins" });
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

  app.post("/api/lift-requests/find-matches", async (req, res) => {
    try {
      const { lat, lng, maxDistanceKm, hoursAgo } = findMatchesSchema.parse(req.body);
      
      const matches = await storage.findMatchingDrivers(lat, lng, maxDistanceKm, hoursAgo);
      
      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          const driver = await storage.getUser(match.scheduleUserId);
          return {
            job: match.job,
            distance: match.distance,
            driver: driver ? {
              id: driver.id,
              name: driver.name,
              avatar: driver.avatar,
              rating: driver.rating,
              verified: driver.verified,
            } : null,
          };
        })
      );
      
      res.json(enrichedMatches);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid match request data", details: error });
      }
      console.error("Find matches error:", error);
      res.status(500).json({ error: "Failed to find matches" });
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

  // Gamification endpoints
  app.post("/api/ratings", async (req, res) => {
    try {
      const validatedData = insertRatingSchema.parse(req.body);
      const rating = await storage.createRating(validatedData);
      res.json(rating);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid rating data", details: error });
      }
      console.error("Create rating error:", error);
      res.status(500).json({ error: "Failed to create rating" });
    }
  });

  app.get("/api/users/:userId/stats", async (req, res) => {
    try {
      const { userId } = req.params;
      let stats = await storage.getUserStats(userId);
      
      if (!stats) {
        stats = await storage.createUserStats(userId);
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ error: "Failed to get user stats" });
    }
  });

  app.get("/api/users/:userId/badges", async (req, res) => {
    try {
      const { userId } = req.params;
      const badges = await storage.getUserBadges(userId);
      res.json(badges);
    } catch (error) {
      console.error("Get user badges error:", error);
      res.status(500).json({ error: "Failed to get user badges" });
    }
  });

  app.get("/api/badges", async (req, res) => {
    try {
      const badges = await storage.getAllBadges();
      res.json(badges);
    } catch (error) {
      console.error("Get badges error:", error);
      res.status(500).json({ error: "Failed to get badges" });
    }
  });

  app.get("/api/users/:userId/last-location", async (req, res) => {
    try {
      const { userId } = req.params;
      const schedules = await storage.getSchedulesByUserId(userId);
      
      let lastLocation: { lat: number; lng: number; location: string; timestamp: string } | null = null;
      let latestTime: Date | null = null;

      for (const schedule of schedules) {
        const jobs = await storage.getJobsByScheduleId(schedule.id);
        
        for (const job of jobs) {
          if (job.checkOutLat !== null && job.checkOutLng !== null && job.actualEndTime) {
            const time = new Date(job.actualEndTime);
            if (!latestTime || time > latestTime) {
              latestTime = time;
              lastLocation = {
                lat: job.checkOutLat,
                lng: job.checkOutLng,
                location: job.toLocation,
                timestamp: job.actualEndTime.toString(),
              };
            }
          }
          
          if (job.checkInLat !== null && job.checkInLng !== null && job.actualStartTime) {
            const time = new Date(job.actualStartTime);
            if (!latestTime || time > latestTime) {
              latestTime = time;
              lastLocation = {
                lat: job.checkInLat,
                lng: job.checkInLng,
                location: job.fromLocation,
                timestamp: job.actualStartTime.toString(),
              };
            }
          }
        }
      }

      res.json(lastLocation);
    } catch (error) {
      console.error("Get last location error:", error);
      res.status(500).json({ error: "Failed to get last location" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received WebSocket message:', message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Broadcast function to notify all connected clients
  function broadcastNotification(notification: any) {
    const message = JSON.stringify(notification);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Store broadcast function for use in routes
  (app as any).broadcastNotification = broadcastNotification;

  return httpServer;
}
