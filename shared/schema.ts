import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  rating: real("rating").default(0),
  totalTrips: integer("total_trips").default(0),
  verified: boolean("verified").default(false),
});

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => schedules.id),
  fromLocation: text("from_location").notNull(),
  fromLat: real("from_lat").notNull(),
  fromLng: real("from_lng").notNull(),
  toLocation: text("to_location").notNull(),
  toLat: real("to_lat").notNull(),
  toLng: real("to_lng").notNull(),
  estimatedStartTime: timestamp("estimated_start_time").notNull(),
  estimatedEndTime: timestamp("estimated_end_time").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  checkInLat: real("check_in_lat"),
  checkInLng: real("check_in_lng"),
  checkOutLat: real("check_out_lat"),
  checkOutLng: real("check_out_lng"),
  status: text("status").notNull().default("pending"),
  orderInSchedule: integer("order_in_schedule").notNull(),
});

export const liftOffers = pgTable("lift_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => users.id),
  fromLocation: text("from_location").notNull(),
  fromLat: real("from_lat").notNull(),
  fromLng: real("from_lng").notNull(),
  toLocation: text("to_location").notNull(),
  toLat: real("to_lat").notNull(),
  toLng: real("to_lng").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  availableSeats: integer("available_seats").notNull(),
  status: text("status").notNull().default("available"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const liftRequests = pgTable("lift_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  fromLocation: text("from_location").notNull(),
  fromLat: real("from_lat").notNull(),
  fromLng: real("from_lng").notNull(),
  toLocation: text("to_location").notNull(),
  toLat: real("to_lat").notNull(),
  toLng: real("to_lng").notNull(),
  requestedTime: timestamp("requested_time").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  avatar: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  actualStartTime: true,
  actualEndTime: true,
  checkInLat: true,
  checkInLng: true,
  checkOutLat: true,
  checkOutLng: true,
}).extend({
  estimatedStartTime: z.union([
    z.date(), 
    z.string().min(1, "Start time is required").pipe(z.coerce.date())
  ]),
  estimatedEndTime: z.union([
    z.date(), 
    z.string().min(1, "End time is required").pipe(z.coerce.date())
  ]),
});

export const insertLiftOfferSchema = createInsertSchema(liftOffers).omit({
  id: true,
  createdAt: true,
});

export const insertLiftRequestSchema = createInsertSchema(liftRequests).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export type InsertLiftOffer = z.infer<typeof insertLiftOfferSchema>;
export type LiftOffer = typeof liftOffers.$inferSelect;

export type InsertLiftRequest = z.infer<typeof insertLiftRequestSchema>;
export type LiftRequest = typeof liftRequests.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
