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
  insertRatingSchema,
  updateUserProfileSchema
} from "@shared/schema";
import { z } from "zod";
import {
  haversineMiles,
  estimateMinutes,
  orderLegs,
  encodePolyline,
  decodePolyline,
  pointNearPolyline,
  bearingDeg,
  angleDiffDeg,
  seededRand,
  type Coordinates,
  type RouteLeg
} from "./ai-routing-utils";

const updateScheduleSchema = insertScheduleSchema.partial();
const updateJobSchema = insertJobSchema.partial();
const checkInOutSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
const findMatchesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  maxDistanceMiles: z.number().positive().max(100).optional().default(10),
  hoursAgo: z.number().positive().max(168).optional().default(24),
});

// AI Routing schemas
const planRouteSchema = z.object({
  driver_id: z.string().min(1),
  date: z.string().optional(),
  legs: z.array(z.object({
    leg_id: z.string().optional(),
    pickup: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }),
    dropoff: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }),
    notes: z.string().optional()
  })).min(1),
  optimize_order: z.boolean().optional().default(true),
  preferences: z.object({
    start_time: z.string().optional()
  }).optional()
});

const driverDensitySchema = z.object({
  route_polyline: z.string().optional(),
  legs: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  })).optional(),
  time_window_start: z.string().optional(),
  corridor_radius_miles: z.number().positive().optional().default(5),
  min_bearing_match_deg: z.number().min(0).max(180).optional().default(35)
});

const aiSummarySchema = z.object({
  plan_id: z.string().optional(),
  density_context: z.object({
    density_score: z.number().min(0).max(1).optional(),
    window: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional(),
  tone: z.enum(["concise", "friendly"]).optional().default("concise")
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  // AI Routing Endpoints
  
  // POST /api/ai/plan-route - Optimize multi-stop route with ETA predictions
  app.post("/api/ai/plan-route", async (req, res) => {
    try {
      const validatedData = planRouteSchema.parse(req.body);
      const { driver_id, date, legs, optimize_order, preferences = {} } = validatedData;

      // Start time and location
      const startTime = preferences?.start_time || (date ? `${date}T08:00:00Z` : new Date().toISOString());
      const startPoint: Coordinates = legs[0]?.pickup || { lat: 52.4862, lng: -1.8904 }; // Birmingham default

      // Optimize route order
      const ordered = optimize_order ? orderLegs(startPoint, legs) : legs;

      // Build route path and calculate ETAs
      const path: Coordinates[] = [];
      let cursor = startPoint;
      let totalMiles = 0;
      const itinerary: any[] = [];

      for (let i = 0; i < ordered.length; i++) {
        const leg = ordered[i];
        
        // Add path segments
        path.push(cursor);
        path.push(leg.pickup);
        totalMiles += haversineMiles(cursor, leg.pickup);

        path.push(leg.dropoff);
        totalMiles += haversineMiles(leg.pickup, leg.dropoff);

        // Calculate ETAs
        const prevDropEta = itinerary.length 
          ? new Date(itinerary[itinerary.length - 1].dropoff_eta)
          : new Date(startTime);
        
        const toPickupMins = estimateMinutes(haversineMiles(cursor, leg.pickup), prevDropEta.toISOString());
        const pickupEta = new Date(prevDropEta.getTime() + toPickupMins * 60000);

        const toDropMins = estimateMinutes(haversineMiles(leg.pickup, leg.dropoff), pickupEta.toISOString());
        const dropEta = new Date(pickupEta.getTime() + toDropMins * 60000);

        // ETA window (±10 minutes)
        const band = 10;
        itinerary.push({
          leg_id: leg.leg_id || `leg_${i + 1}`,
          pickup_eta: pickupEta.toISOString(),
          dropoff_eta: dropEta.toISOString(),
          eta_low: new Date(dropEta.getTime() - band * 60000).toISOString(),
          eta_high: new Date(dropEta.getTime() + band * 60000).toISOString(),
          advisories: leg.notes ? [leg.notes] : []
        });

        cursor = leg.dropoff;
      }

      const driveMinutes = itinerary.length 
        ? Math.max(0, Math.round((new Date(itinerary[itinerary.length - 1].dropoff_eta).getTime() - new Date(startTime).getTime()) / 60000))
        : 0;
      
      const polyline = encodePolyline(path);

      // Suggest meet-up window after first drop
      const firstDrop = itinerary[0] ? new Date(itinerary[0].dropoff_eta) : new Date(startTime);
      const meetStart = new Date(firstDrop.getTime() + 10 * 60000);
      const meetEnd = new Date(firstDrop.getTime() + 30 * 60000);
      const nearPoint = path[Math.floor(path.length / 3)] || cursor;

      const response = {
        plan_id: `plan_${Math.random().toString(36).slice(2, 8)}`,
        driver_id,
        date: date || new Date().toISOString().slice(0, 10),
        summary: `Start ${new Date(startTime).toISOString().slice(11, 16)}. ${ordered.length} legs. Est finish ${itinerary.length ? itinerary[itinerary.length - 1].dropoff_eta.slice(11, 16) : "N/A"}.`,
        itinerary,
        route: {
          polyline,
          distance_miles: Number(totalMiles.toFixed(1)),
          drive_minutes: driveMinutes
        },
        suggested_meet_windows: [{
          window_start: meetStart.toISOString(),
          window_end: meetEnd.toISOString(),
          nearby_corridor: { 
            lat: Number((nearPoint.lat || 52.04).toFixed(3)), 
            lng: Number((nearPoint.lng || -1.19).toFixed(3)), 
            radius_miles: 3.0 
          },
          reason: "Gap after first drop. Known driver activity corridor."
        }]
      };

      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("AI plan-route error:", error);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  });

  // POST /api/ai/driver-density - Analyze driver density along route
  app.post("/api/ai/driver-density", async (req, res) => {
    try {
      const validatedData = driverDensitySchema.parse(req.body);
      const { 
        route_polyline, 
        legs, 
        time_window_start, 
        corridor_radius_miles, 
        min_bearing_match_deg 
      } = validatedData;

      // Build polyline points
      let polyPts: Coordinates[] = [];
      if (route_polyline) {
        polyPts = decodePolyline(route_polyline);
      } else if (Array.isArray(legs) && legs.length >= 2) {
        polyPts = legs.map((p: any) => ({ lat: p.lat, lng: p.lng }));
      } else {
        return res.status(400).json({ error: "MISSING_ROUTE", detail: "Provide route_polyline or legs[]" });
      }

      // Get all lift offers and requests for driver density calculation
      const liftOffers = await storage.getAllLiftOffers();
      const liftRequests = await storage.getAllLiftRequests();

      // Simulate active driver pings from lift offers and requests
      const nowISO = new Date().toISOString();
      const activePings = [
        ...liftOffers.map(o => ({ 
          driver_id: o.driverId, 
          lat: o.fromLat, 
          lng: o.fromLng,
          speed_kph: 60,
          bearing_deg: bearingDeg({ lat: o.fromLat, lng: o.fromLng }, { lat: o.toLat, lng: o.toLng }),
          ping_time: o.createdAt ? o.createdAt.toISOString() : nowISO
        })),
        ...liftRequests.map(r => ({ 
          driver_id: r.requesterId, 
          lat: r.fromLat, 
          lng: r.fromLng,
          speed_kph: 0,
          bearing_deg: 0,
          ping_time: r.createdAt ? r.createdAt.toISOString() : nowISO
        }))
      ];

      // Filter pings near the corridor
      const active = activePings.filter(p => {
        const near = pointNearPolyline({ lat: p.lat, lng: p.lng }, polyPts, corridor_radius_miles);
        if (!near) return false;
        
        // Optional bearing match
        if (typeof p.bearing_deg === "number" && typeof min_bearing_match_deg === "number") {
          const segBearing = bearingDeg(polyPts[0], polyPts[polyPts.length - 1]);
          const diff = angleDiffDeg(p.bearing_deg, segBearing);
          return diff <= min_bearing_match_deg;
        }
        return true;
      });

      // Simple density scoring
      const lookbackSeed = new Date(time_window_start || new Date().toISOString()).getHours() + active.length * 7;
      const histCluster = Math.floor(seededRand(lookbackSeed) * 10); // 0-9 virtual historical count
      const activeNow = active.length;
      const hour = new Date(time_window_start || new Date().toISOString()).getHours();
      const weekdayEffect = [1, 1.05, 1.1, 1.1, 1.15, 1.05, 0.9][new Date().getDay()] || 1;

      // Logistic scoring
      const z = 0.15 * activeNow + 0.1 * histCluster + 0.02 * hour + Math.log(weekdayEffect);
      const densityScore = Math.max(0, Math.min(1, 1 / (1 + Math.exp(-z))));
      const label = densityScore < 0.34 ? "Low" : densityScore < 0.67 ? "Medium" : "High";
      const predictedAvailable = Math.max(activeNow, Math.round((activeNow + histCluster) * densityScore));

      const centerIdx = Math.max(1, Math.floor(polyPts.length / 2));
      const hotspotCenter = polyPts[centerIdx] || polyPts[0];

      res.json({
        density_score: Number(densityScore.toFixed(2)),
        label,
        active_driver_count: activeNow,
        predicted_available_in_window: predictedAvailable,
        hotspots: [{
          center: hotspotCenter,
          radius_miles: Math.max(3, corridor_radius_miles - 1),
          score: Number(Math.min(1, densityScore + 0.1).toFixed(2)),
          why: "Time and route match typical activity pattern"
        }],
        method: {
          radius_miles: corridor_radius_miles,
          bearing_match_deg: min_bearing_match_deg,
          lookback_days: 28
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("AI driver-density error:", error);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  });

  // POST /api/ai/summary - Generate AI summary text
  app.post("/api/ai/summary", async (req, res) => {
    try {
      const validatedData = aiSummarySchema.parse(req.body);
      const { plan_id, density_context, tone } = validatedData;
      
      const score = density_context?.density_score ?? 0;
      const level = score >= 0.67 ? "strong" : score >= 0.34 ? "moderate" : "low";
      const windowText = density_context?.window
        ? `${density_context.window.start?.slice(11, 16)} to ${density_context.window.end?.slice(11, 16)}`
        : "the next 2 hours";

      const text =
        tone === "friendly"
          ? `Plan ${plan_id || ""} looks solid. Expect ${level} driver presence along your route around ${windowText}. Share your plan to sync a lift.`
          : `You have ${level} nearby driver presence around ${windowText}. Share your plan to line up a lift.`;

      res.json({ text: text.trim() });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("AI summary error:", error);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  });

  // Seed demo data endpoint (for marketing/testing)
  // Create messages for current user with demo users
  app.post("/api/seed-user-messages", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const cities = [
        { name: "Newcastle" },
        { name: "Durham" },
        { name: "Sunderland" },
        { name: "Middlesbrough" },
        { name: "Darlington" },
      ];

      const messageTemplates = [
        "Hey! Are you heading to {location} today?",
        "I saw your lift offer - still available?",
        "Perfect timing! I need a lift to {location}",
        "Thanks for the lift yesterday, really appreciated it!",
        "Can we meet at the usual spot?",
        "Running 10 mins late, is that ok?",
        "Are you free for a lift to {location} tomorrow?",
        "Great riding with you today!",
        "What time are you leaving for {location}?",
        "I can offer a return lift if needed",
        "Cheers for the ride mate!",
        "Still doing the {location} run this week?",
        "Need a lift urgently - you available?",
        "Let me know when you're ready to go",
        "See you at the pickup point!",
      ];

      // Get all demo users
      const allUsers = await storage.getAllUsers();
      const demoUsers = allUsers.filter(u => u.username?.startsWith("demo_"));

      if (demoUsers.length === 0) {
        return res.status(400).json({ error: "No demo users found. Run /api/seed-demo-data first" });
      }

      // Create 15 messages: some sent by user, some received by user
      let messagesCreated = 0;
      for (let i = 0; i < 15; i++) {
        const demoUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
        const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
        const location = cities[Math.floor(Math.random() * cities.length)].name;
        const content = template.replace("{location}", location);
        
        // Alternate between sending and receiving
        const isSentByUser = i % 2 === 0;
        
        await storage.createMessage({
          senderId: isSentByUser ? userId : demoUser.id,
          receiverId: isSentByUser ? demoUser.id : userId,
          content,
        });
        messagesCreated++;
      }

      res.json({ 
        success: true, 
        message: `Created ${messagesCreated} messages for user`,
        messagesCreated
      });
    } catch (error) {
      console.error("Seed user messages error:", error);
      res.status(500).json({ error: "Failed to seed user messages" });
    }
  });

  app.post("/api/seed-demo-data", async (req, res) => {
    try {
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash("demo1234", 10);
      
      // North East England cities
      const cities = [
        { name: "Newcastle upon Tyne", lat: 54.9783, lng: -1.6178 },
        { name: "Durham", lat: 54.7761, lng: -1.5733 },
        { name: "Sunderland", lat: 54.9069, lng: -1.3838 },
        { name: "Middlesbrough", lat: 54.5742, lng: -1.2350 },
        { name: "Darlington", lat: 54.5268, lng: -1.5528 },
        { name: "Gateshead", lat: 54.9526, lng: -1.6043 },
        { name: "South Shields", lat: 55.0066, lng: -1.4322 },
        { name: "Hartlepool", lat: 54.6917, lng: -1.2125 },
        { name: "Stockton-on-Tees", lat: 54.5697, lng: -1.3184 },
        { name: "Washington", lat: 54.9000, lng: -1.5167 },
      ];

      const firstNames = ["James", "John", "Robert", "Michael", "William", "David", "Richard"];
      const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis"];
      
      const createdUsers: any[] = [];
      
      // Create 100 users
      for (let i = 0; i < 100; i++) {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const callSign = `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${Math.floor(1000 + Math.random() * 9000)}`;
        const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        
        const user = await storage.createUser({
          username: `demo_${callSign.toLowerCase()}`,
          password: hashedPassword,
          name,
        } as any); // Using 'as any' since storage.createUser handles callSign generation internally
        createdUsers.push(user);
      }

      // Create lift offers and requests
      for (const user of createdUsers) {
        const city = cities[Math.floor(Math.random() * cities.length)];
        const destCity = cities[Math.floor(Math.random() * cities.length)];
        const latOffset = (Math.random() - 0.5) * 0.14;
        const lngOffset = (Math.random() - 0.5) * 0.14;
        
        const isOffer = Math.random() < 0.6;
        const now = new Date();
        const futureTime = new Date(now.getTime() + Math.random() * 24 * 60 * 60 * 1000);

        if (isOffer) {
          await storage.createLiftOffer({
            driverId: user.id,
            fromLocation: city.name,
            fromLat: city.lat + latOffset,
            fromLng: city.lng + lngOffset,
            toLocation: destCity.name,
            toLat: destCity.lat + latOffset,
            toLng: destCity.lng + lngOffset,
            departureTime: futureTime,
            availableSeats: Math.floor(1 + Math.random() * 3),
            status: "available",
            notes: "Happy to share the journey!",
          });
        } else {
          await storage.createLiftRequest({
            requesterId: user.id,
            fromLocation: city.name,
            fromLat: city.lat + latOffset,
            fromLng: city.lng + lngOffset,
            toLocation: destCity.name,
            toLat: destCity.lat + latOffset,
            toLng: destCity.lng + lngOffset,
            requestedTime: futureTime,
            notes: "Looking for a lift!",
          });
        }
      }

      // Create 50 demo messages between random users
      const messageTemplates = [
        "Hey, I saw your lift offer. Are you still available?",
        "Perfect timing! I need a lift to {location}",
        "Thanks for the lift yesterday, really appreciated it!",
        "Can you pick me up from the usual spot?",
        "Running 10 mins late, still ok?",
        "Great ride today, cheers!",
        "Are you heading to {location} tomorrow?",
        "I can offer a lift back if you need one",
        "What time are you leaving?",
        "Sounds good, see you there!",
      ];

      let messagesCreated = 0;
      for (let i = 0; i < 50; i++) {
        const user1 = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        const user2 = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        
        if (user1.id !== user2.id) {
          const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
          const location = cities[Math.floor(Math.random() * cities.length)].name;
          const content = template.replace("{location}", location);
          
          await storage.createMessage({
            senderId: user1.id,
            receiverId: user2.id,
            content,
          });
          messagesCreated++;
        }
      }

      // Also create messages for user-1 with demo users
      let userMessagesCreated = 0;
      const user1 = await storage.getUser("user-1");
      if (user1 && createdUsers.length > 0) {
        const userMessageTemplates = [
          "Hey! Are you heading to {location} today?",
          "I saw your lift offer - still available?",
          "Perfect timing! I need a lift to {location}",
          "Thanks for the lift yesterday!",
          "Can we meet at the usual spot?",
          "Running 10 mins late, is that ok?",
          "Are you free for a lift to {location} tomorrow?",
          "Great riding with you today!",
          "What time are you leaving for {location}?",
          "I can offer a return lift if needed",
        ];

        for (let i = 0; i < 15; i++) {
          const demoUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
          const template = userMessageTemplates[Math.floor(Math.random() * userMessageTemplates.length)];
          const location = cities[Math.floor(Math.random() * cities.length)].name;
          const content = template.replace("{location}", location);
          
          // Alternate between sending and receiving
          const isSentByUser = i % 2 === 0;
          
          await storage.createMessage({
            senderId: isSentByUser ? "user-1" : demoUser.id,
            receiverId: isSentByUser ? demoUser.id : "user-1",
            content,
          });
          userMessagesCreated++;
        }
      }

      res.json({ 
        success: true, 
        message: `Created ${createdUsers.length} demo users, 100 lift offers/requests, ${messagesCreated} demo messages, and ${userMessagesCreated} messages for your account`,
        usersCreated: createdUsers.length,
        messagesCreated,
        userMessagesCreated
      });
    } catch (error) {
      console.error("Seed demo data error:", error);
      res.status(500).json({ error: "Failed to seed demo data" });
    }
  });

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

  // GET /api/jobs - Get all jobs (optionally filtered by date)
  app.get("/api/jobs", async (req, res) => {
    try {
      const { date } = req.query;
      
      if (!req.session?.userId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      // Get user's schedules
      const userSchedules = await storage.getSchedulesByUserId(req.session.userId);
      
      if (!userSchedules || userSchedules.length === 0) {
        return res.json([]);
      }

      // Get jobs from all schedules or filtered by date
      let allJobs: any[] = [];
      for (const schedule of userSchedules) {
        if (!date || schedule.date.startsWith(date as string)) {
          const jobs = await storage.getJobsByScheduleId(schedule.id);
          if (jobs) {
            allJobs = allJobs.concat(jobs);
          }
        }
      }

      res.json(allJobs);
    } catch (error) {
      console.error("GET /api/jobs error:", error);
      res.status(500).json({ error: "SERVER_ERROR" });
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
      const { lat, lng, maxDistanceMiles, hoursAgo } = findMatchesSchema.parse(req.body);
      
      const matches = await storage.findMatchingDrivers(lat, lng, maxDistanceMiles, hoursAgo);
      
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

  // User profile endpoints
  // GET /api/user - Get current authenticated user
  app.get("/api/user", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.patch("/api/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const validated = updateUserProfileSchema.parse(req.body);
      
      const updates: any = {};
      if (validated.name) updates.name = validated.name.trim();
      if (validated.email !== undefined) updates.email = validated.email || null;
      if (validated.phone !== undefined) updates.phone = validated.phone || null;
      
      const updatedUser = await storage.updateUser(userId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid user data", details: error });
      }
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
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
