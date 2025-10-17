import bcrypt from "bcrypt";
import { storage } from "../server/storage.js";

// North East England cities with coordinates
const neEnglandCities = [
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

// Generate random call sign (LL#### format)
function generateCallSign(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const digits = Math.floor(1000 + Math.random() * 9000); // 4 digits
  return `${letter1}${letter2}${digits}`;
}

// Generate random coordinate near a city (within ~5 mile radius)
function randomizeLocation(baseLat: number, baseLng: number) {
  // ~0.01 degree = ~0.7 miles, so ±0.07 = ~5 mile radius
  const latOffset = (Math.random() - 0.5) * 0.14;
  const lngOffset = (Math.random() - 0.5) * 0.14;
  return {
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset,
  };
}

// Generate random timestamp for next 24 hours
function randomFutureTimestamp(): Date {
  const now = new Date();
  const hoursAhead = Math.floor(Math.random() * 24);
  const minutesAhead = Math.floor(Math.random() * 60);
  now.setHours(now.getHours() + hoursAhead);
  now.setMinutes(now.getMinutes() + minutesAhead);
  return now;
}

// First names for variety
const firstNames = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Christopher",
  "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Andrew", "Paul", "Joshua", "Kenneth",
  "Kevin", "Brian", "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan", "Jacob",
  "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon", "Raymond",
  "Frank", "Gregory", "Samuel", "Patrick", "Alexander", "Jack", "Dennis", "Jerry", "Tyler", "Aaron",
  "Henry", "Douglas", "Peter", "Adam", "Nathan", "Zachary", "Walter", "Kyle", "Harold", "Carl",
  "Jeremy", "Keith", "Roger", "Gerald", "Ethan", "Arthur", "Terry", "Christian", "Sean", "Austin",
  "Noah", "Benjamin", "Bruce", "Albert", "Bryan", "Billy", "Joe", "Dylan", "Jordan", "Ralph",
  "Roy", "Eugene", "Randy", "Vincent", "Russell", "Louis", "Philip", "Bobby", "Johnny", "Bradley",
  "Lawrence", "Carlos", "Ernest", "Wayne", "Howard", "Fred", "Craig", "Alan", "Harry", "Victor"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
  "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts", "Gomez",
  "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart",
  "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson",
  "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson", "Watson",
  "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes", "Price",
  "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross", "Foster", "Jimenez", "Powell"
];

async function seedDemoDrivers() {
  console.log("🚗 Starting to seed 100 demo drivers for North East England...");

  const hashedPassword = await bcrypt.hash("demo1234", 10);
  const createdUsers: { id: string; callSign: string }[] = [];
  const usedCallSigns = new Set<string>();

  // Create 100 demo users
  for (let i = 0; i < 100; i++) {
    let callSign = generateCallSign();
    
    // Ensure unique call sign
    while (usedCallSigns.has(callSign)) {
      callSign = generateCallSign();
    }
    usedCallSigns.add(callSign);

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const username = `demo_${callSign.toLowerCase()}`;

    try {
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        callSign,
        role: "user",
        rating: 3 + Math.random() * 2, // Random rating between 3-5
        totalTrips: Math.floor(Math.random() * 50), // Random trip count
        subscriptionStatus: "active", // Active subscription for demo
      });

      createdUsers.push({ id: user.id, callSign: user.callSign });
      console.log(`✅ Created user: ${name} (${callSign})`);
    } catch (error) {
      console.error(`❌ Failed to create user ${name}:`, error);
    }
  }

  console.log(`\n🎯 Created ${createdUsers.length} demo users`);
  console.log("\n📍 Creating lift offers and requests...");

  // Create lift offers and requests for demo users
  for (const user of createdUsers) {
    const city = neEnglandCities[Math.floor(Math.random() * neEnglandCities.length)];
    const destCity = neEnglandCities[Math.floor(Math.random() * neEnglandCities.length)];
    
    const fromLocation = randomizeLocation(city.lat, city.lng);
    const toLocation = randomizeLocation(destCity.lat, destCity.lng);
    
    // 60% lift offers, 40% lift requests
    const isOffer = Math.random() < 0.6;

    try {
      if (isOffer) {
        await storage.createLiftOffer({
          driverId: user.id,
          fromLocation: city.name,
          fromLat: fromLocation.lat,
          fromLng: fromLocation.lng,
          toLocation: destCity.name,
          toLat: toLocation.lat,
          toLng: toLocation.lng,
          departureTime: randomFutureTimestamp(),
          availableSeats: Math.floor(1 + Math.random() * 3), // 1-3 seats
          status: "available",
          notes: "Happy to share the journey!",
        });
        console.log(`🔵 Created lift offer for ${user.callSign}: ${city.name} → ${destCity.name}`);
      } else {
        await storage.createLiftRequest({
          requesterId: user.id,
          fromLocation: city.name,
          fromLat: fromLocation.lat,
          fromLng: fromLocation.lng,
          toLocation: destCity.name,
          toLat: toLocation.lat,
          toLng: toLocation.lng,
          requestedTime: randomFutureTimestamp(),
          notes: "Looking for a lift!",
        });
        console.log(`🟢 Created lift request for ${user.callSign}: ${city.name} → ${destCity.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create lift for ${user.callSign}:`, error);
    }
  }

  console.log("\n✨ Demo lifts created!");
  console.log("\n💬 Creating believable messages between drivers...");

  // Message templates
  const messageTemplates = [
    "Hi! I saw you're heading to {city} tomorrow. Any chance of a lift? Happy to chip in for petrol!",
    "Thanks for the lift yesterday! Really appreciated it mate 👍",
    "Are you still offering that ride to {city}? I'd be interested if there's space",
    "Hi {name}, I'm going to pick up from {city} on Tuesday. Want to share the journey?",
    "Morning! I see we're both heading to {city} around the same time. Fancy meeting up for the journey?",
    "Cheers for accepting my lift request! What time works best for you?",
    "Hi there, I noticed you're often around {city}. I deliver there regularly too - maybe we could coordinate sometime?",
    "Thanks again for yesterday's lift. Let me know if you ever need a return favour!",
    "Morning {name}! Are you still available for that lift to {city} this afternoon?",
    "Hi, I'm new to the DriveNet community. Thanks for the lift offer - really helpful!",
    "Perfect timing on that lift offer! I'll meet you at the usual spot?",
    "Appreciate the message mate. Yeah I can do {city} on Thursday if that helps?",
    "Hi! Regular route from {city} to {city2} every week. Always happy to share - saves us both some hassle!",
    "Thanks for being so reliable with the lifts. Makes the job so much easier!",
    "Morning! I've got a delivery near {city} today. If you need a lift back let me know",
    "Cheers {name}! See you at the services at 10am then?",
    "That lift yesterday was spot on timing. Thanks again!",
    "Hi, I'm heading to {city} tomorrow morning. Room for one more if you're interested?",
    "Perfect! I'll be there at 2pm. Thanks for sorting this",
    "Morning mate! Still on for that {city} run this afternoon?",
  ];

  const cities = neEnglandCities.map(c => c.name);
  
  // Create 50 realistic message exchanges
  for (let i = 0; i < 50; i++) {
    // Pick two random different users
    const sender = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    let receiver = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    
    // Make sure they're different users
    while (receiver.id === sender.id) {
      receiver = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    }

    // Pick a random message template and customize it
    let template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const randomCity2 = cities[Math.floor(Math.random() * cities.length)];
    
    // Get sender name for personalization
    const senderUser = await storage.getUser(sender.id);
    const receiverUser = await storage.getUser(receiver.id);
    
    const message = template
      .replace('{city}', randomCity)
      .replace('{city2}', randomCity2)
      .replace('{name}', receiverUser?.name.split(' ')[0] || 'there');

    try {
      await storage.createMessage({
        senderId: sender.id,
        receiverId: receiver.id,
        content: message,
        read: Math.random() > 0.3, // 70% read, 30% unread for realism
      });
      console.log(`💬 ${sender.callSign} → ${receiver.callSign}: "${message.substring(0, 40)}..."`);
    } catch (error) {
      console.error(`❌ Failed to create message:`, error);
    }
  }

  console.log("\n✨ Demo driver seeding complete!");
  console.log(`📊 Summary:`);
  console.log(`   - ${createdUsers.length} demo users created`);
  console.log(`   - All with call signs in LL#### format`);
  console.log(`   - Spread across North East England`);
  console.log(`   - Mix of lift offers (blue markers) and requests (green markers)`);
  console.log(`   - 50 realistic messages between drivers`);
  console.log(`\n🔐 All demo users have password: demo1234`);
  console.log(`📝 Username format: demo_{callsign} (e.g., demo_ab1234)`);
}

seedDemoDrivers()
  .then(() => {
    console.log("\n🎉 Seeding successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });
