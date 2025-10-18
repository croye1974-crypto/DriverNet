import { storage } from "./storage";

const firstNames = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
  "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth",
  "Emily", "Emma", "Madison", "Olivia", "Hannah", "Abigail", "Isabella", "Samantha", "Elizabeth", "Ashley",
  "George", "Harry", "Jack", "Jacob", "Charlie", "Thomas", "Oscar", "William", "James", "Oliver",
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker",
  "Adams", "Nelson", "Carter", "Mitchell", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans",
  "Edwards", "Collins", "Stewart", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy",
];

const cities = [
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Manchester", lat: 53.4808, lng: -2.2426 },
  { name: "Birmingham", lat: 52.4862, lng: -1.8904 },
  { name: "Leeds", lat: 53.8008, lng: -1.5491 },
  { name: "Liverpool", lat: 53.4084, lng: -2.9916 },
  { name: "Bristol", lat: 51.4545, lng: -2.5879 },
  { name: "Sheffield", lat: 53.3811, lng: -1.4701 },
  { name: "Newcastle", lat: 54.9783, lng: -1.6178 },
  { name: "Nottingham", lat: 52.9548, lng: -1.1581 },
  { name: "Leicester", lat: 52.6369, lng: -1.1398 },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0]!;
}

function randomTime(hourStart: number, hourEnd: number): Date {
  const hour = Math.floor(Math.random() * (hourEnd - hourStart)) + hourStart;
  const minute = Math.random() < 0.5 ? 0 : 30;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function seedDatabase() {
  console.log("🌱 Seeding database with 100 users...");

  // Create 100 users
  const users = [];
  for (let i = 0; i < 100; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}`;
    
    const user = await storage.createUser({
      username,
      password: "password123", // Will be hashed by storage
      name: `${firstName} ${lastName}`,
      subscriptionStatus: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      planId: "price_premium",
      role: "user",
    });

    users.push(user);

    // Create user stats
    await storage.createUserStats(user.id);

    console.log(`✅ Created user ${i + 1}/100: ${user.name} (${user.callSign})`);
  }

  console.log("\n📅 Creating delivery schedules and jobs...");

  // Create schedules and jobs for each user
  for (const user of users) {
    // Create schedules for today, tomorrow, and day after
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const scheduleDate = randomDate(dayOffset);
      
      const schedule = await storage.createSchedule({
        userId: user.id,
        date: scheduleDate,
      });

      // Create 2-4 jobs per schedule
      const numJobs = Math.floor(Math.random() * 3) + 2;
      let previousEndTime = randomTime(6, 9); // Start between 6-9 AM

      for (let jobNum = 0; jobNum < numJobs; jobNum++) {
        const fromCity = randomItem(cities);
        const toCity = randomItem(cities.filter(c => c.name !== fromCity.name));

        const startTime = new Date(previousEndTime);
        const duration = (Math.floor(Math.random() * 4) + 1) * 30; // 30min to 2 hours
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

        await storage.createJob({
          scheduleId: schedule.id,
          fromLocation: `${fromCity.name} Dealership`,
          fromLat: fromCity.lat + (Math.random() - 0.5) * 0.1,
          fromLng: fromCity.lng + (Math.random() - 0.5) * 0.1,
          toLocation: `${toCity.name} Station`,
          toLat: toCity.lat + (Math.random() - 0.5) * 0.1,
          toLng: toCity.lng + (Math.random() - 0.5) * 0.1,
          estimatedStartTime: startTime,
          estimatedEndTime: endTime,
          orderInSchedule: jobNum + 1,
          status: dayOffset === 0 && jobNum === 0 ? "in_progress" : "pending",
        });

        // Add gap between jobs (15-45 minutes)
        const gapMinutes = Math.floor(Math.random() * 30) + 15;
        previousEndTime = new Date(endTime.getTime() + gapMinutes * 60 * 1000);
      }
    }
  }

  console.log("\n🎉 Database seeded successfully!");
  console.log(`📊 Created ${users.length} users with delivery schedules`);
  console.log(`📍 Users are distributed across UK cities`);
  console.log(`🚗 Each user has 3 days of delivery schedules with 2-4 jobs per day`);
  
  return users;
}

// Run seed if this file is executed directly
// DISABLED during deployment to prevent health check timeouts
// Use /api/test/seed-database endpoint in development mode instead
// if (import.meta.url === `file://${process.argv[1]}`) {
//   seedDatabase()
//     .then(() => {
//       console.log("\n✨ Seeding complete!");
//       process.exit(0);
//     })
//     .catch((error) => {
//       console.error("❌ Seeding failed:", error);
//       process.exit(1);
//     });
// }

export { seedDatabase };
