import { 
  type User, type InsertUser,
  type Schedule, type InsertSchedule,
  type Job, type InsertJob,
  type LiftOffer, type InsertLiftOffer,
  type LiftRequest, type InsertLiftRequest,
  type Message, type InsertMessage,
} from "@shared/schema";
import { randomUUID } from "crypto";

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
  
  // Jobs
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getJobsByScheduleId(scheduleId: string): Promise<Job[]>;
  updateJobStatus(id: string, status: string, actualStartTime?: Date, actualEndTime?: Date): Promise<Job | undefined>;
  
  // Lift Offers
  createLiftOffer(offer: InsertLiftOffer): Promise<LiftOffer>;
  getLiftOffer(id: string): Promise<LiftOffer | undefined>;
  getAllLiftOffers(): Promise<LiftOffer[]>;
  getLiftOffersByDriverId(driverId: string): Promise<LiftOffer[]>;
  updateLiftOfferStatus(id: string, status: string): Promise<LiftOffer | undefined>;
  
  // Lift Requests
  createLiftRequest(request: InsertLiftRequest): Promise<LiftRequest>;
  getLiftRequest(id: string): Promise<LiftRequest | undefined>;
  getAllLiftRequests(): Promise<LiftRequest[]>;
  getLiftRequestsByRequesterId(requesterId: string): Promise<LiftRequest[]>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(userId1: string, userId2: string): Promise<Message[]>;
  getConversations(userId: string): Promise<{ userId: string; lastMessage: Message }[]>;
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

  // Jobs
  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const job: Job = {
      ...insertJob,
      id,
      status: insertJob.status ?? "pending",
      actualStartTime: null,
      actualEndTime: null,
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

  async updateJobStatus(
    id: string, 
    status: string, 
    actualStartTime?: Date, 
    actualEndTime?: Date
  ): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const updatedJob: Job = {
      ...job,
      status,
      actualStartTime: actualStartTime ?? job.actualStartTime,
      actualEndTime: actualEndTime ?? job.actualEndTime,
    };
    this.jobs.set(id, updatedJob);
    return updatedJob;
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

  async getConversations(userId: string): Promise<{ userId: string; lastMessage: Message }[]> {
    const userMessages = Array.from(this.messages.values()).filter(
      (msg) => msg.senderId === userId || msg.receiverId === userId
    );

    const conversationMap = new Map<string, Message>();
    
    userMessages.forEach((msg) => {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const existing = conversationMap.get(otherUserId);
      
      if (!existing || (msg.createdAt && existing.createdAt && msg.createdAt > existing.createdAt)) {
        conversationMap.set(otherUserId, msg);
      }
    });

    return Array.from(conversationMap.entries()).map(([userId, lastMessage]) => ({
      userId,
      lastMessage,
    }));
  }
}

export const storage = new MemStorage();
