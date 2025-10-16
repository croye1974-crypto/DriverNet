import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // bcrypt hashed
  name: text("name").notNull(),
  callSign: varchar("call_sign", { length: 6 }).notNull().unique(), // Format: LL#### (e.g., AB1234)
  avatar: text("avatar"),
  role: text("role").notNull().default("user"), // user, moderator, admin
  rating: real("rating").default(0),
  totalTrips: integer("total_trips").default(0),
  verified: boolean("verified").default(false),
  
  // Subscription fields
  stripeCustomerId: text("stripe_customer_id").unique(),
  subscriptionStatus: text("subscription_status").default("inactive"), // trialing, active, past_due, canceled, inactive
  currentPeriodEnd: timestamp("current_period_end"),
  planId: text("plan_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
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
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ratings for shared lifts
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  raterId: varchar("rater_id").notNull().references(() => users.id),
  ratedUserId: varchar("rated_user_id").notNull().references(() => users.id),
  liftType: text("lift_type").notNull(), // 'offer' or 'request'
  liftId: varchar("lift_id").notNull(), // ID of the lift offer or request
  stars: integer("stars").notNull(), // 1-5
  punctuality: integer("punctuality"), // 1-5
  professionalism: integer("professionalism"), // 1-5
  communication: integer("communication"), // 1-5
  vehicleCondition: integer("vehicle_condition"), // 1-5 (for offers only)
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User statistics and reputation
export const userStats = pgTable("user_stats", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  reputationScore: integer("reputation_score").default(0), // 0-100
  tier: text("tier").default("bronze"), // bronze, silver, gold, platinum
  totalLiftsShared: integer("total_lifts_shared").default(0),
  totalLiftsOffered: integer("total_lifts_offered").default(0),
  totalLiftsRequested: integer("total_lifts_requested").default(0),
  averageRating: real("average_rating").default(0),
  punctualityScore: real("punctuality_score").default(0), // 0-100
  completionRatio: real("completion_ratio").default(0), // 0-100
  totalPoints: integer("total_points").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Badge catalog
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // milestone, quality, community, safety
  icon: text("icon").notNull(), // emoji or icon name
  requirement: text("requirement").notNull(), // description of how to earn
  threshold: integer("threshold"), // numeric threshold if applicable
});

// User badges earned
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeId: varchar("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow(),
  progress: integer("progress").default(0), // for tracking progress toward badge
});

// User reports for abuse/safety
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(), // harassment, unsafe_driving, fake_location, spam, other
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, reviewed, action_taken, dismissed
  reviewedBy: varchar("reviewed_by").references(() => users.id), // admin who reviewed
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// User blocks for privacy
export const blocks = pgTable("blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull().references(() => users.id),
  blockedUserId: varchar("blocked_user_id").notNull().references(() => users.id),
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

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
}).extend({
  stars: z.number().min(1).max(5),
  punctuality: z.number().min(1).max(5).optional(),
  professionalism: z.number().min(1).max(5).optional(),
  communication: z.number().min(1).max(5).optional(),
  vehicleCondition: z.number().min(1).max(5).optional(),
});

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  updatedAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges);

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  earnedAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SelectUser = typeof users.$inferSelect;

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

export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type Block = typeof blocks.$inferSelect;
