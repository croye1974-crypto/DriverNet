import { 
  type User, type InsertUser,
  type Schedule, type InsertSchedule,
  type Job, type InsertJob,
  type LiftOffer, type InsertLiftOffer,
  type LiftRequest, type InsertLiftRequest,
  type Message, type InsertMessage,
  type Rating, type InsertRating,
  type UserStats, type InsertUserStats,
  type Badge, type InsertBadge,
  type UserBadge, type InsertUserBadge,
  type Report, type InsertReport,
  type Block, type InsertBlock,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateCallSign(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const numbers = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  return `${letter1}${letter2}${numbers}`;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSubscription(userId: string, updates: {
    stripeCustomerId?: string;
    subscriptionStatus?: string;
    currentPeriodEnd?: Date | null;
    planId?: string | null;
  }): Promise<User | undefined>;
  
  // Schedules
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  getSchedule(id: string): Promise<Schedule | undefined>;
  getSchedulesByUserId(userId: string): Promise<Schedule[]>;
  getScheduleByUserAndDate(userId: string, date: string): Promise<Schedule | undefined>;
  updateSchedule(id: string, updates: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: string): Promise<boolean>;
  
  // Jobs
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getJobsByScheduleId(scheduleId: string): Promise<Job[]>;
  getRecentCheckIns(hoursAgo: number): Promise<Job[]>;
  updateJobStatus(id: string, status: string, actualStartTime?: Date, actualEndTime?: Date, checkInLat?: number, checkInLng?: number, checkOutLat?: number, checkOutLng?: number): Promise<Job | undefined>;
  updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;
  findMatchingSchedules(jobId: string, maxDistanceKm: number, maxTimeWindowMinutes: number): Promise<{ job: Job, distance: number, timeDifferenceMinutes: number, scheduleUserId: string, userName: string }[]>;
  
  // Lift Offers
  createLiftOffer(offer: InsertLiftOffer): Promise<LiftOffer>;
  getLiftOffer(id: string): Promise<LiftOffer | undefined>;
  getAllLiftOffers(): Promise<LiftOffer[]>;
  getLiftOffersByDriverId(driverId: string): Promise<LiftOffer[]>;
  updateLiftOfferStatus(id: string, status: string): Promise<LiftOffer | undefined>;
  deleteLiftOffer(id: string): Promise<boolean>;
  
  // Lift Requests
  createLiftRequest(request: InsertLiftRequest): Promise<LiftRequest>;
  getLiftRequest(id: string): Promise<LiftRequest | undefined>;
  getAllLiftRequests(): Promise<LiftRequest[]>;
  getLiftRequestsByRequesterId(requesterId: string): Promise<LiftRequest[]>;
  findMatchingDrivers(requestLat: number, requestLng: number, maxDistanceKm: number, hoursAgo: number): Promise<{ job: Job, distance: number, scheduleUserId: string }[]>;
  deleteLiftRequest(id: string): Promise<boolean>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(userId1: string, userId2: string): Promise<Message[]>;
  getConversations(userId: string): Promise<{ 
    userId: string; 
    name: string;
    lastMessage: string; 
    timestamp: string;
    unreadCount: number;
  }[]>;
  createScheduleMatchMessage(user1Id: string, user2Id: string, location: string, time: string, distance: number): Promise<Message[]>;
  
  // Ratings
  createRating(rating: InsertRating): Promise<Rating>;
  getRatingsByUserId(userId: string): Promise<Rating[]>;
  getRatingForLift(raterId: string, liftId: string): Promise<Rating | undefined>;
  
  // User Stats
  getUserStats(userId: string): Promise<UserStats | undefined>;
  createUserStats(userId: string): Promise<UserStats>;
  updateUserStats(userId: string, updates: Partial<InsertUserStats>): Promise<UserStats | undefined>;
  calculateReputationScore(userId: string): Promise<number>;
  updateReputationScore(userId: string): Promise<void>;
  
  // Badges
  getBadge(id: string): Promise<Badge | undefined>;
  getAllBadges(): Promise<Badge[]>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  
  // User Badges
  getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]>;
  awardBadge(userId: string, badgeId: string): Promise<UserBadge | null>;
  checkAndAwardBadges(userId: string): Promise<UserBadge[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private schedules: Map<string, Schedule>;
  private jobs: Map<string, Job>;
  private liftOffers: Map<string, LiftOffer>;
  private liftRequests: Map<string, LiftRequest>;
  private messages: Map<string, Message>;
  private ratings: Map<string, Rating>;
  private userStats: Map<string, UserStats>;
  private badges: Map<string, Badge>;
  private userBadges: Map<string, UserBadge>;

  constructor() {
    this.users = new Map();
    this.schedules = new Map();
    this.jobs = new Map();
    this.liftOffers = new Map();
    this.liftRequests = new Map();
    this.messages = new Map();
    this.ratings = new Map();
    this.userStats = new Map();
    this.badges = new Map();
    this.userBadges = new Map();
    
    this.seedInitialData();
  }

  private seedInitialData(): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Hash password 'demo' for demo users (synchronous for seed data)
    const hashedPassword = bcrypt.hashSync('demo', 10);

    const demoUsers: User[] = [
      { 
        id: 'user-1', 
        username: 'john_driver', 
        password: hashedPassword, 
        name: 'John Smith', 
        callSign: 'JS1234', 
        avatar: null, 
        role: 'user',
        rating: 4.8, 
        totalTrips: 156, 
        verified: true,
        stripeCustomerId: null,
        subscriptionStatus: 'active', // Give demo users active subscription
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        planId: 'demo-plan',
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      },
      { 
        id: 'user-2', 
        username: 'sarah_delivers', 
        password: hashedPassword, 
        name: 'Sarah Johnson', 
        callSign: 'SJ5678', 
        avatar: null, 
        role: 'user',
        rating: 4.9, 
        totalTrips: 203, 
        verified: true,
        stripeCustomerId: null,
        subscriptionStatus: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planId: 'demo-plan',
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
      },
      { 
        id: 'user-3', 
        username: 'mike_transport', 
        password: hashedPassword, 
        name: 'Mike Williams', 
        callSign: 'MW9012', 
        avatar: null, 
        role: 'user',
        rating: 4.7, 
        totalTrips: 98, 
        verified: true,
        stripeCustomerId: null,
        subscriptionStatus: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planId: 'demo-plan',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      },
      { 
        id: 'user-4', 
        username: 'emma_driver', 
        password: hashedPassword, 
        name: 'Emma Brown', 
        callSign: 'EB3456', 
        avatar: null, 
        role: 'moderator', // Make one demo user a moderator for testing
        rating: 4.6, 
        totalTrips: 134, 
        verified: true,
        stripeCustomerId: null,
        subscriptionStatus: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planId: 'demo-plan',
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      },
    ];

    demoUsers.forEach(user => {
      this.users.set(user.id, user);
    });

    const now = new Date();
    const today4pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0);
    const today630pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 30);

    const demoLiftRequests: LiftRequest[] = [
      {
        id: '1',
        requesterId: 'user-2',
        fromLat: 53.7960,
        fromLng: -1.5491,
        toLat: 53.3808,
        toLng: -1.4703,
        fromLocation: 'Leeds Station',
        toLocation: 'Sheffield Dealership',
        requestedTime: today4pm,
        notes: null,
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      },
      {
        id: '2',
        requesterId: 'user-3',
        fromLat: 52.9548,
        fromLng: -1.1581,
        toLat: 52.9225,
        toLng: -1.4746,
        fromLocation: 'Nottingham Centre',
        toLocation: 'Derby Train Station',
        requestedTime: today630pm,
        notes: null,
        createdAt: new Date(Date.now() - 12 * 60 * 1000),
      },
    ];

    demoLiftRequests.forEach(request => {
      this.liftRequests.set(request.id, request);
    });

    // Seed badges
    const demoBadges: Badge[] = [
      // Milestone badges
      { id: 'first-lift', name: 'First Lift', description: 'Complete your first shared lift', category: 'milestone', icon: '🚗', requirement: 'Share 1 lift', threshold: 1 },
      { id: '10-lifts', name: '10 Lifts', description: 'Share 10 lifts with other drivers', category: 'milestone', icon: '🔟', requirement: 'Share 10 lifts', threshold: 10 },
      { id: '50-lifts', name: '50 Lifts', description: 'Share 50 lifts with other drivers', category: 'milestone', icon: '⭐', requirement: 'Share 50 lifts', threshold: 50 },
      { id: '100-lifts', name: 'Century Club', description: 'Share 100 lifts with other drivers', category: 'milestone', icon: '💯', requirement: 'Share 100 lifts', threshold: 100 },
      
      // Quality badges
      { id: '5-star-pro', name: '5-Star Pro', description: 'Maintain 4.8+ rating over 20 trips', category: 'quality', icon: '⭐', requirement: 'Average 4.8+ stars over 20 lifts', threshold: null },
      { id: 'perfect-week', name: 'Perfect Week', description: 'Receive only 5-star ratings for a week', category: 'quality', icon: '🌟', requirement: '7 days of 5-star ratings', threshold: null },
      
      // Community badges
      { id: 'helpful-driver', name: 'Helpful Driver', description: 'Receive 10 thank you messages', category: 'community', icon: '🤝', requirement: '10 thank you messages', threshold: 10 },
      { id: 'quick-responder', name: 'Quick Responder', description: 'Reply to messages within 5 minutes', category: 'community', icon: '⚡', requirement: '20 quick responses', threshold: 20 },
      
      // Safety badges
      { id: 'on-time-champion', name: 'On-Time Champion', description: 'Maintain 95%+ punctuality for 30 days', category: 'safety', icon: '⏰', requirement: '95%+ punctuality for 30 days', threshold: null },
      { id: 'route-master', name: 'Route Master', description: 'Complete 50 routes without delays', category: 'safety', icon: '🗺️', requirement: '50 on-time deliveries', threshold: 50 },
    ];

    demoBadges.forEach(badge => {
      this.badges.set(badge.id, badge);
    });

    // Seed initial user stats for demo users
    demoUsers.forEach(user => {
      const rating = user.rating ?? 0;
      const totalTrips = user.totalTrips ?? 0;
      const stats: UserStats = {
        userId: user.id,
        reputationScore: Math.round((rating / 5) * 60 + 20), // Simplified initial score
        tier: rating >= 4.8 ? 'gold' : rating >= 4.5 ? 'silver' : 'bronze',
        totalLiftsShared: totalTrips,
        totalLiftsOffered: Math.floor(totalTrips * 0.6),
        totalLiftsRequested: Math.floor(totalTrips * 0.4),
        averageRating: rating,
        punctualityScore: 85 + Math.random() * 10,
        completionRatio: 90 + Math.random() * 8,
        totalPoints: totalTrips * 100,
        currentStreak: Math.floor(Math.random() * 7),
        longestStreak: Math.floor(Math.random() * 30),
        lastActivityDate: new Date(),
        updatedAt: new Date(),
      };
      this.userStats.set(user.id, stats);
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    let callSign = generateCallSign();
    
    // Ensure unique call sign
    while (Array.from(this.users.values()).some(u => u.callSign === callSign)) {
      callSign = generateCallSign();
    }
    
    const user: User = { 
      ...insertUser, 
      id,
      callSign,
      role: 'user',
      rating: 0,
      totalTrips: 0,
      verified: false,
      avatar: insertUser.avatar ?? null,
      stripeCustomerId: null,
      subscriptionStatus: 'inactive',
      currentPeriodEnd: null,
      planId: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    
    // Initialize user stats
    await this.createUserStats(id);
    
    return user;
  }

  async updateUserSubscription(userId: string, updates: {
    stripeCustomerId?: string;
    subscriptionStatus?: string;
    currentPeriodEnd?: Date | null;
    planId?: string | null;
  }): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      ...updates,
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Schedules
  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const id = randomUUID();
    const schedule: Schedule = { 
      ...insertSchedule, 
      id,
      createdAt: new Date(),
    };
    this.schedules.set(id, schedule);
    return schedule;
  }

  async getSchedule(id: string): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async getSchedulesByUserId(userId: string): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(
      (schedule) => schedule.userId === userId
    );
  }

  async getScheduleByUserAndDate(userId: string, date: string): Promise<Schedule | undefined> {
    return Array.from(this.schedules.values()).find(
      (schedule) => schedule.userId === userId && schedule.date === date
    );
  }

  async updateSchedule(id: string, updates: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;
    
    const updatedSchedule: Schedule = {
      ...schedule,
      ...updates,
    };
    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    return this.schedules.delete(id);
  }

  // Jobs
  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const job: Job = {
      ...insertJob,
      id,
      status: insertJob.status ?? "pending",
      actualStartTime: null,
      actualEndTime: null,
      checkInLat: null,
      checkInLng: null,
      checkOutLat: null,
      checkOutLng: null,
    };
    this.jobs.set(id, job);
    return job;
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobsByScheduleId(scheduleId: string): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.scheduleId === scheduleId)
      .sort((a, b) => a.orderInSchedule - b.orderInSchedule);
  }

  async getRecentCheckIns(hoursAgo: number): Promise<Job[]> {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    return Array.from(this.jobs.values()).filter((job) => {
      const hasRecentCheckIn = job.actualStartTime && 
        new Date(job.actualStartTime) >= cutoffTime &&
        job.checkInLat !== null && 
        job.checkInLng !== null;
      
      const hasRecentCheckOut = job.actualEndTime && 
        new Date(job.actualEndTime) >= cutoffTime &&
        job.checkOutLat !== null && 
        job.checkOutLng !== null;
      
      return hasRecentCheckIn || hasRecentCheckOut;
    });
  }

  async updateJobStatus(
    id: string, 
    status: string, 
    actualStartTime?: Date, 
    actualEndTime?: Date,
    checkInLat?: number,
    checkInLng?: number,
    checkOutLat?: number,
    checkOutLng?: number
  ): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const updatedJob: Job = {
      ...job,
      status,
      actualStartTime: actualStartTime ?? job.actualStartTime,
      actualEndTime: actualEndTime ?? job.actualEndTime,
      checkInLat: checkInLat ?? job.checkInLat,
      checkInLng: checkInLng ?? job.checkInLng,
      checkOutLat: checkOutLat ?? job.checkOutLat,
      checkOutLng: checkOutLng ?? job.checkOutLng,
    };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const updatedJob: Job = {
      ...job,
      ...updates,
    };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async findMatchingSchedules(
    jobId: string,
    maxDistanceKm: number = 3, // Default 3km for pickup coordination
    maxTimeWindowMinutes: number = 60 // Default 1 hour window
  ): Promise<{ job: Job, distance: number, timeDifferenceMinutes: number, scheduleUserId: string, userName: string }[]> {
    const sourceJob = await this.getJob(jobId);
    if (!sourceJob) return [];

    const sourceSchedule = await this.getSchedule(sourceJob.scheduleId);
    if (!sourceSchedule) return [];

    const matches: { job: Job, distance: number, timeDifferenceMinutes: number, scheduleUserId: string, userName: string }[] = [];

    // Check all jobs for matches
    for (const job of this.jobs.values()) {
      // Skip the source job
      if (job.id === jobId) continue;

      const schedule = await this.getSchedule(job.scheduleId);
      if (!schedule) continue;

      // Skip same user
      if (schedule.userId === sourceSchedule.userId) continue;

      // Check destination proximity
      const distance = calculateDistance(
        sourceJob.toLat,
        sourceJob.toLng,
        job.toLat,
        job.toLng
      );

      if (distance <= maxDistanceKm) {
        // Check time proximity (using estimated end times)
        const sourceTime = new Date(sourceJob.estimatedEndTime).getTime();
        const targetTime = new Date(job.estimatedEndTime).getTime();
        const timeDifferenceMs = Math.abs(sourceTime - targetTime);
        const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

        if (timeDifferenceMinutes <= maxTimeWindowMinutes) {
          const user = await this.getUser(schedule.userId);
          matches.push({
            job,
            distance,
            timeDifferenceMinutes,
            scheduleUserId: schedule.userId,
            userName: user?.name || 'Unknown Driver',
          });
        }
      }
    }

    // Sort by distance (closest first)
    return matches.sort((a, b) => a.distance - b.distance);
  }

  // Lift Offers
  async createLiftOffer(insertOffer: InsertLiftOffer): Promise<LiftOffer> {
    const id = randomUUID();
    const offer: LiftOffer = {
      ...insertOffer,
      id,
      status: insertOffer.status ?? "available",
      notes: insertOffer.notes ?? null,
      createdAt: new Date(),
    };
    this.liftOffers.set(id, offer);
    return offer;
  }

  async getLiftOffer(id: string): Promise<LiftOffer | undefined> {
    return this.liftOffers.get(id);
  }

  async getAllLiftOffers(): Promise<LiftOffer[]> {
    return Array.from(this.liftOffers.values());
  }

  async getLiftOffersByDriverId(driverId: string): Promise<LiftOffer[]> {
    return Array.from(this.liftOffers.values()).filter(
      (offer) => offer.driverId === driverId
    );
  }

  async updateLiftOfferStatus(id: string, status: string): Promise<LiftOffer | undefined> {
    const offer = this.liftOffers.get(id);
    if (!offer) return undefined;
    
    const updatedOffer: LiftOffer = { ...offer, status };
    this.liftOffers.set(id, updatedOffer);
    return updatedOffer;
  }

  async deleteLiftOffer(id: string): Promise<boolean> {
    return this.liftOffers.delete(id);
  }

  // Lift Requests
  async createLiftRequest(insertRequest: InsertLiftRequest): Promise<LiftRequest> {
    const id = randomUUID();
    const request: LiftRequest = {
      ...insertRequest,
      id,
      notes: insertRequest.notes ?? null,
      createdAt: new Date(),
    };
    this.liftRequests.set(id, request);
    return request;
  }

  async getLiftRequest(id: string): Promise<LiftRequest | undefined> {
    return this.liftRequests.get(id);
  }

  async getAllLiftRequests(): Promise<LiftRequest[]> {
    return Array.from(this.liftRequests.values());
  }

  async getLiftRequestsByRequesterId(requesterId: string): Promise<LiftRequest[]> {
    return Array.from(this.liftRequests.values()).filter(
      (request) => request.requesterId === requesterId
    );
  }

  async findMatchingDrivers(
    requestLat: number, 
    requestLng: number, 
    maxDistanceKm: number, 
    hoursAgo: number
  ): Promise<{ job: Job, distance: number, scheduleUserId: string }[]> {
    const recentJobs = await this.getRecentCheckIns(hoursAgo);
    const matches: { job: Job, distance: number, scheduleUserId: string }[] = [];

    for (const job of recentJobs) {
      let checkLat: number | null = null;
      let checkLng: number | null = null;

      if (job.checkOutLat !== null && job.checkOutLng !== null && job.actualEndTime) {
        checkLat = job.checkOutLat;
        checkLng = job.checkOutLng;
      } else if (job.checkInLat !== null && job.checkInLng !== null && job.actualStartTime) {
        checkLat = job.checkInLat;
        checkLng = job.checkInLng;
      }

      if (checkLat !== null && checkLng !== null) {
        const distance = calculateDistance(requestLat, requestLng, checkLat, checkLng);
        
        if (distance <= maxDistanceKm) {
          const schedule = await this.getSchedule(job.scheduleId);
          if (schedule) {
            matches.push({ job, distance, scheduleUserId: schedule.userId });
          }
        }
      }
    }

    return matches.sort((a, b) => a.distance - b.distance);
  }

  async deleteLiftRequest(id: string): Promise<boolean> {
    return this.liftRequests.delete(id);
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(
        (msg) =>
          (msg.senderId === userId1 && msg.receiverId === userId2) ||
          (msg.senderId === userId2 && msg.receiverId === userId1)
      )
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }

  async getConversations(userId: string): Promise<{ 
    userId: string; 
    name: string;
    lastMessage: string; 
    timestamp: string;
    unreadCount: number;
  }[]> {
    const userMessages = Array.from(this.messages.values()).filter(
      (msg) => msg.senderId === userId || msg.receiverId === userId
    );

    const conversationMap = new Map<string, { 
      lastMessage: Message; 
      unreadCount: number;
    }>();
    
    userMessages.forEach((msg) => {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const existing = conversationMap.get(otherUserId);
      
      const unreadIncrement = (msg.receiverId === userId && !msg.read) ? 1 : 0;
      
      if (!existing) {
        conversationMap.set(otherUserId, {
          lastMessage: msg,
          unreadCount: unreadIncrement,
        });
      } else {
        const msgTime = msg.createdAt?.getTime() ?? 0;
        const existingTime = existing.lastMessage.createdAt?.getTime() ?? 0;
        
        if (msgTime > existingTime || (msgTime === existingTime && msg.id > existing.lastMessage.id)) {
          existing.lastMessage = msg;
        }
        existing.unreadCount += unreadIncrement;
      }
    });

    const conversations = Array.from(conversationMap.entries()).map(([otherUserId, data]) => {
      const otherUser = this.users.get(otherUserId);
      return {
        userId: otherUserId,
        name: otherUser?.name || "Unknown User",
        lastMessage: data.lastMessage.content,
        timestamp: data.lastMessage.createdAt ? data.lastMessage.createdAt.toISOString() : "",
        unreadCount: data.unreadCount,
        sortTime: data.lastMessage.createdAt?.getTime() ?? 0,
      };
    });

    return conversations.sort((a, b) => b.sortTime - a.sortTime).map(({ sortTime, ...conv }) => conv);
  }

  async createScheduleMatchMessage(
    user1Id: string, 
    user2Id: string, 
    location: string, 
    time: string, 
    distance: number
  ): Promise<Message[]> {
    const user1 = await this.getUser(user1Id);
    const user2 = await this.getUser(user2Id);
    
    if (!user1 || !user2) return [];

    const distanceText = distance < 1 
      ? `${Math.round(distance * 1000)}m` 
      : `${distance.toFixed(1)}km`;

    // Create a system message in their conversation thread
    // This appears in user1's conversation with user2 and vice versa
    const messageContent = `Schedule Match! Your route matches ${user2.name}'s schedule. You'll both be near ${location} around ${time} (within ${distanceText}). Contact them to discuss pickup arrangements.`;
    
    // Message in user1's view (appears to come from user2 to encourage conversation)
    const message1: Message = {
      id: randomUUID(),
      senderId: user2Id,
      receiverId: user1Id,
      content: messageContent,
      createdAt: new Date(),
      read: false,
    };
    
    // Message in user2's view (appears to come from user1 to encourage conversation)  
    const messageContent2 = `Schedule Match! Your route matches ${user1.name}'s schedule. You'll both be near ${location} around ${time} (within ${distanceText}). Contact them to discuss pickup arrangements.`;
    
    const message2: Message = {
      id: randomUUID(),
      senderId: user1Id,
      receiverId: user2Id,
      content: messageContent2,
      createdAt: new Date(),
      read: false,
    };

    this.messages.set(message1.id, message1);
    this.messages.set(message2.id, message2);

    return [message1, message2];
  }

  // Ratings
  async createRating(insertRating: InsertRating): Promise<Rating> {
    const id = randomUUID();
    const rating: Rating = {
      id,
      raterId: insertRating.raterId,
      ratedUserId: insertRating.ratedUserId,
      liftType: insertRating.liftType,
      liftId: insertRating.liftId,
      stars: insertRating.stars,
      punctuality: insertRating.punctuality ?? null,
      professionalism: insertRating.professionalism ?? null,
      communication: insertRating.communication ?? null,
      vehicleCondition: insertRating.vehicleCondition ?? null,
      comment: insertRating.comment ?? null,
      createdAt: new Date(),
    };
    this.ratings.set(id, rating);
    
    // Update user stats after rating
    await this.updateReputationScore(insertRating.ratedUserId);
    await this.checkAndAwardBadges(insertRating.ratedUserId);
    
    return rating;
  }

  async getRatingsByUserId(userId: string): Promise<Rating[]> {
    return Array.from(this.ratings.values())
      .filter((rating) => rating.ratedUserId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getRatingForLift(raterId: string, liftId: string): Promise<Rating | undefined> {
    return Array.from(this.ratings.values()).find(
      (rating) => rating.raterId === raterId && rating.liftId === liftId
    );
  }

  // User Stats
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    return this.userStats.get(userId);
  }

  async createUserStats(userId: string): Promise<UserStats> {
    const stats: UserStats = {
      userId,
      reputationScore: 0,
      tier: 'bronze',
      totalLiftsShared: 0,
      totalLiftsOffered: 0,
      totalLiftsRequested: 0,
      averageRating: 0,
      punctualityScore: 0,
      completionRatio: 0,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      updatedAt: new Date(),
    };
    this.userStats.set(userId, stats);
    return stats;
  }

  async updateUserStats(userId: string, updates: Partial<InsertUserStats>): Promise<UserStats | undefined> {
    const stats = this.userStats.get(userId);
    if (!stats) return undefined;
    
    const updatedStats: UserStats = {
      ...stats,
      ...updates,
      updatedAt: new Date(),
    };
    this.userStats.set(userId, updatedStats);
    return updatedStats;
  }

  async calculateReputationScore(userId: string): Promise<number> {
    const ratings = await this.getRatingsByUserId(userId);
    const stats = await this.getUserStats(userId);
    
    if (!stats) return 0;
    
    // Calculate 90-day rolling average rating (60% weight)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentRatings = ratings.filter(r => r.createdAt && r.createdAt >= ninetyDaysAgo);
    const avgRating = recentRatings.length > 0
      ? recentRatings.reduce((sum, r) => sum + r.stars, 0) / recentRatings.length
      : 0;
    const ratingScore = (avgRating / 5) * 60;
    
    // Punctuality score (25% weight)
    const punctualityScore = ((stats.punctualityScore ?? 0) / 100) * 25;
    
    // Completion ratio (15% weight)
    const completionScore = ((stats.completionRatio ?? 0) / 100) * 15;
    
    return Math.round(ratingScore + punctualityScore + completionScore);
  }

  async updateReputationScore(userId: string): Promise<void> {
    let stats = await this.getUserStats(userId);
    if (!stats) {
      stats = await this.createUserStats(userId);
    }
    
    const reputationScore = await this.calculateReputationScore(userId);
    
    // Determine tier based on score
    let tier: string;
    if (reputationScore >= 95) tier = 'platinum';
    else if (reputationScore >= 85) tier = 'gold';
    else if (reputationScore >= 70) tier = 'silver';
    else tier = 'bronze';
    
    // Calculate average rating
    const ratings = await this.getRatingsByUserId(userId);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
      : 0;
    
    await this.updateUserStats(userId, {
      reputationScore,
      tier,
      averageRating,
    });
  }

  // Badges
  async getBadge(id: string): Promise<Badge | undefined> {
    return this.badges.get(id);
  }

  async getAllBadges(): Promise<Badge[]> {
    return Array.from(this.badges.values());
  }

  async createBadge(badge: InsertBadge): Promise<Badge> {
    this.badges.set(badge.id, badge);
    return badge;
  }

  // User Badges
  async getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]> {
    const userBadges = Array.from(this.userBadges.values())
      .filter((ub) => ub.userId === userId);
    
    return userBadges.map((ub) => ({
      ...ub,
      badge: this.badges.get(ub.badgeId)!,
    })).filter((ub) => ub.badge); // Filter out badges that don't exist
  }

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge | null> {
    // Check if user already has this badge
    const existing = Array.from(this.userBadges.values()).find(
      (ub) => ub.userId === userId && ub.badgeId === badgeId
    );
    if (existing) return null;
    
    const id = randomUUID();
    const userBadge: UserBadge = {
      id,
      userId,
      badgeId,
      progress: 100,
      earnedAt: new Date(),
    };
    this.userBadges.set(id, userBadge);
    return userBadge;
  }

  async checkAndAwardBadges(userId: string): Promise<UserBadge[]> {
    const stats = await this.getUserStats(userId);
    if (!stats) return [];
    
    const awarded: UserBadge[] = [];
    
    // Check milestone badges
    const milestones = [
      { id: 'first-lift', threshold: 1 },
      { id: '10-lifts', threshold: 10 },
      { id: '50-lifts', threshold: 50 },
      { id: '100-lifts', threshold: 100 },
    ];
    
    for (const milestone of milestones) {
      if ((stats.totalLiftsShared ?? 0) >= milestone.threshold) {
        const badge = await this.awardBadge(userId, milestone.id);
        if (badge) awarded.push(badge);
      }
    }
    
    // Check quality badges
    const ratings = await this.getRatingsByUserId(userId);
    if (ratings.length >= 20) {
      const avg = ratings.slice(0, 20).reduce((sum, r) => sum + r.stars, 0) / 20;
      if (avg >= 4.8) {
        const badge = await this.awardBadge(userId, '5-star-pro');
        if (badge) awarded.push(badge);
      }
    }
    
    return awarded;
  }
}

export const storage = new MemStorage();
