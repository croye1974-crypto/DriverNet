import { 
  type User, type InsertUser,
  type Schedule, type InsertSchedule,
  type Job, type InsertJob,
  type LiftOffer, type InsertLiftOffer,
  type LiftRequest, type InsertLiftRequest,
  type Message, type InsertMessage,
} from "@shared/schema";
import { randomUUID } from "crypto";

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

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private schedules: Map<string, Schedule>;
  private jobs: Map<string, Job>;
  private liftOffers: Map<string, LiftOffer>;
  private liftRequests: Map<string, LiftRequest>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.schedules = new Map();
    this.jobs = new Map();
    this.liftOffers = new Map();
    this.liftRequests = new Map();
    this.messages = new Map();
    
    this.seedInitialData();
  }

  private seedInitialData(): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const demoUsers: User[] = [
      { id: 'user-1', username: 'john_driver', password: 'demo', name: 'John Smith', avatar: null, rating: 4.8, totalTrips: 156, verified: true },
      { id: 'user-2', username: 'sarah_delivers', password: 'demo', name: 'Sarah Johnson', avatar: null, rating: 4.9, totalTrips: 203, verified: true },
      { id: 'user-3', username: 'mike_transport', password: 'demo', name: 'Mike Williams', avatar: null, rating: 4.7, totalTrips: 98, verified: true },
      { id: 'user-4', username: 'emma_driver', password: 'demo', name: 'Emma Brown', avatar: null, rating: 4.6, totalTrips: 134, verified: true },
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
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      rating: 0,
      totalTrips: 0,
      verified: false,
      avatar: insertUser.avatar ?? null,
    };
    this.users.set(id, user);
    return user;
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

    // Message to user1 about user2
    const messageContent1 = `🚗 Schedule Match! Your route matches ${user2.name}'s schedule. You'll both be near ${location} around ${time} (within ${distanceText}). Contact them to discuss pickup arrangements.`;
    
    const message1: Message = {
      id: randomUUID(),
      senderId: 'system',
      receiverId: user1Id,
      content: messageContent1,
      createdAt: new Date(),
    };
    
    // Message to user2 about user1
    const messageContent2 = `🚗 Schedule Match! Your route matches ${user1.name}'s schedule. You'll both be near ${location} around ${time} (within ${distanceText}). Contact them to discuss pickup arrangements.`;
    
    const message2: Message = {
      id: randomUUID(),
      senderId: 'system',
      receiverId: user2Id,
      content: messageContent2,
      createdAt: new Date(),
    };

    this.messages.set(message1.id, message1);
    this.messages.set(message2.id, message2);

    return [message1, message2];
  }
}

export const storage = new MemStorage();
