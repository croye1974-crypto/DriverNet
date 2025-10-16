# DriverLift - Trade Plate Driver Ride Sharing Platform

## Overview
DriverLift is a ride-sharing application designed for trade plate car delivery drivers. Its primary purpose is to connect drivers for shared lifts to their next jobs or public transport. The platform aims to streamline the logistics for delivery drivers by providing features such as GPS tracking, scheduling, real-time location updates, and efficient driver matching. The business vision is to optimize driver workflow, reduce travel inefficiencies, and foster a connected community among professional drivers.

## User Preferences
- Mobile-first design prioritized
- GPS accuracy critical for driver matching
- Quick job check-in/out essential for workflow
- Map view preferred over list for finding nearby drivers
- I prefer clear and concise explanations.
- I prefer an iterative development approach.
- I prefer to be asked before major architectural changes are made.
- I prefer functional programming paradigms where appropriate.

## Branding
- **Logo**: DriveNet logo (attached_assets/image_1760603053099.png)
  - Currently displayed in app header (top left corner)
  - To be used on future login screen
  - Blue rounded square icon with car and arrow, red/blue "DRIVENET" text

## System Architecture

### UI/UX Decisions
The application prioritizes a native mobile app aesthetic, featuring a light gray background, subtle shadow-based elevation instead of borders, and clean headers. Spacing is optimized for mobile list density, and bottom navigation is used with larger icons. The design maintains a minimalist approach with clean surfaces, native spacing, typography, and a system font stack. Interactive elements have test IDs for automated testing.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query (v5) for state management, Shadcn UI + Radix UI for components, Tailwind CSS for styling, and React Hook Form with Zod for forms. It supports dark/light themes.
- **Backend**: Express.js with TypeScript, using in-memory storage (MemStorage) for MVP and RESTful endpoints with Zod validation.
- **Shared**: Drizzle ORM schemas with Zod for type-safe contracts.
- **Real-time Communication**: WebSocket integration for instant driver location updates and proactive notifications.
- **Geolocation**: GPS tracking with a fallback system, Haversine formula for driver matching within 10 miles, and integration with postcodes.io for UK postcode lookup.
- **Mapping**: Interactive map view with distinct markers for lift offers (blue) and requests (green), clickable markers for messaging, zoom/pan controls, and an interactive legend.
- **Scheduling**: Daily schedule management with job input, check-in/check-out with GPS capture, and a job status flow (Pending → In Progress → Completed).
- **Messaging**: Full messaging system with real-time API integration.
- **Notifications**: Real-time proactive notifications for nearby driver check-ins/outs, with proximity-based filtering.
- **Concurrency**: Vite dev server for frontend with HMR, Express server with tsx watch mode, served on the same port via Vite middleware.

### Feature Specifications
- Driver profile management.
- Browsing and posting lift requests/offers.
- Automatic driver matching within a 10-mile radius.
- Job check-in/check-out with GPS location capture.
- Real-time messaging and notifications.
- Schedule management.
- Map visualization of lift offers and requests with interactive markers.
- Robust datetime validation for job creation.
- Confirmation flows for lift requests.
- Conversation search and ordering in messaging.

### System Design Choices
The application is structured with a clear separation between frontend, backend, and shared components to ensure maintainability and scalability. An in-memory database is used for rapid MVP development, with plans for a more persistent solution. WebSockets are central to providing a real-time experience for driver interactions and location updates. The design prioritizes mobile-first usability and accessibility.

## External Dependencies
- **Data Fetching/Caching**: `@tanstack/react-query`
- **Routing**: `wouter`
- **ORM**: `drizzle-orm`
- **Schema Validation**: `zod`
- **Icons**: `lucide-react`
- **Form Management**: `react-hook-form`
- **Mapping**: Leaflet
- **External API**: postcodes.io (for UK postcode lookup)

## Recent Changes (October 16, 2025)

### Lift Request Acceptance System
- ✅ **Complete lift request acceptance flow implemented**
  - MessageDialog displays green "Accept Request" button for lift requests
  - DELETE /api/lift-requests/:id endpoint removes request from system
  - Success toast: "You've accepted X's lift request. The request has been removed from the system."
  - Query invalidation triggers automatic update of both map and list views
  - **Verified on mobile (375x667 viewport)** - both map markers and list cards update without refresh
  - Demo data seeded: 2 lift requests in development mode for testing

### FindLifts API Integration
- ✅ **Migrated from mock data to live API**
  - useQuery fetches from /api/lift-requests
  - Both map and list views use same query data source
  - Ensures consistency between map markers and list cards
  - Loading states and empty states handled
  - Automatic updates when lift requests are deleted

### Zoom-Responsive Map Markers
- ✅ **Dynamic marker scaling for 2000+ users on mobile**
  - Markers scale based on zoom level to prevent overcrowding
  - **Marker sizes by zoom level:**
    - Zoom ≤6 (country view): 10px
    - Zoom 7-8 (region view): 14px
    - Zoom 9-10 (city view): 20px
    - Zoom 11-12 (neighborhood): 26px
    - Zoom ≥13 (street view): 32px
  - Icons and borders scale proportionally with marker size
  - Touch tolerance increased to 25px for accurate tapping of small markers
  - Separate useEffects to handle zoom vs data changes independently
  - Map fitBounds only triggered by data changes, not zoom changes
  - **Verified on mobile (375x667 viewport)** - smooth scaling, remains tappable at all zoom levels

### Dialog Z-Index Implementation
- ⚠️ **Partial implementation** - works in tests, needs mobile device verification
  - Dialog overlay: z-index 9998 (inline style)
  - Dialog content: z-index 9999 (inline style)
  - Map container: z-index 1
  - May need additional mobile-specific fixes

### Automatic Schedule Match Notifications
- ✅ **Complete schedule matching system implemented and tested**
  - Detects when drivers will be at same destination (within 3km) at similar time (within 60 minutes)
  - Automatically creates messages in the conversation thread between matched drivers
  - Real-time WebSocket notifications alert both drivers instantly
  - Message format: "Schedule Match! Your route matches [Driver Name]'s schedule. You'll both be near [Location] around [Time] (within Xkm). Contact them to discuss pickup arrangements."
  - Matching triggered automatically on job creation via POST /api/jobs
  - Storage methods: findMatchingSchedules() and createScheduleMatchMessage()
  - Filters out same-user jobs and sorts matches by proximity
  - Messages appear in regular conversation threads (not separate system conversations)
  - **Tested on mobile (375x667)** - all functionality verified including API and UI

### Gamification & Scoring System (Uber-like)
- ✅ **Complete driver reputation and achievement system implemented**
  - **Driver Ratings**: 1-5 star bilateral ratings with KPI tags (punctuality, professionalism, communication, vehicle condition)
  - **Reputation Score** (0-100): Weighted calculation - 60% rolling 90-day rating, 25% punctuality, 15% completion ratio
  - **Tier System**: Bronze (0-69), Silver (70-84), Gold (85-94), Platinum (95-100)
  - **Achievement Badges**: Milestone, Quality, Community, and Safety badges with auto-award logic
  - **Gamification Features**: Points system, streak tracking, progress indicators
  - **Profile Enhancement**: Displays reputation score, tier badge, achievements, performance metrics, lifetime stats
  - **API Endpoints**: POST /api/ratings, GET /api/users/:id/stats, GET /api/users/:id/badges, GET /api/badges
  - **Storage Methods**: createRating(), calculateReputationScore(), checkAndAwardBadges(), awardBadge()
  - **Badge Catalog**: 10 pre-defined badges (First Lift, 10 Lifts, 50 Lifts, 100 Lifts, 5-Star Pro, Perfect Week, Helpful Driver, Quick Responder, On-Time Champion, Route Master)
  - **Stats Tracked**: Total lifts shared, punctuality score, completion ratio, current streak, longest streak, total points

### Driver Call Sign System
- ✅ **Complete call sign identification system implemented**
  - **Call Sign Format**: LL#### (2 uppercase letters + 4 digits), e.g., AB1234, MJ4782, EW9156
  - **Purpose**: Simplify driver identification for less tech-savvy users - easier to remember than full names
  - **Auto-Generation**: Call signs automatically generated on user creation with uniqueness validation
  - **Display Locations**: 
    - FindLifts page: Driver cards show call signs instead of names
    - Messages page: Conversations list displays call signs
    - Profile page: User's call sign shown as Badge below name (data-testid="text-call-sign")
    - MessageDialog: Header shows call sign when messaging drivers
    - Map markers: Call signs used in tooltips/popups
  - **Implementation**: Added callSign field to user schema, updated storage layer with generation logic, UI components updated across all pages
  - **Testing**: Verified on mobile (375x667) - all displays working correctly

### Dynamic Spell Checking System
- ✅ **Location name spell checking implemented**
  - **Enabled**: ONLY on free-text location/place name inputs (spellCheck="true")
    - AddJobDialog: fromLocation, toLocation inputs
    - LocationInput component (used in schedule)
    - RequestLiftForm: from/to location inputs
    - PostLiftForm: from/to location inputs
  - **Disabled**: Postcode inputs (spellCheck={false})
    - AddJobDialog: fromPostcode, toPostcode inputs
    - Postcodes are structured codes, not words requiring spell checking
  - **Purpose**: Help drivers enter accurate place names to improve location matching and reduce typos
  - **Testing**: Verified on mobile (375x667) - location names have spell checking, postcodes do not

### Authentication & Subscription System (P0 - Production Ready)
- ✅ **Complete authentication system implemented**
  - **Password Security**: bcrypt hashing (10 salt rounds) for all passwords
  - **Session Management**: express-session with MemoryStore, 30-day cookie lifetime
  - **Auth Routes**: 
    - POST /api/auth/register - user registration with username uniqueness check
    - POST /api/auth/login - credential validation with bcrypt.compare
    - POST /api/auth/logout - session destruction
    - GET /api/auth/me - returns current authenticated user (without password)
  - **Demo Credentials**: All demo users (john_driver, sarah_delivers, mike_transport, emma_driver) use password 'demo' (hashed)
  - **Testing**: Verified login flow with hashed passwords

- ✅ **Subscription infrastructure & access control**
  - **Schema Updates** (users table):
    - stripeCustomerId: Stripe customer identifier
    - subscriptionStatus: 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled'
    - currentPeriodEnd: subscription expiration date
    - planId: subscription plan identifier
    - role: 'user' | 'moderator' | 'admin' for access control
    - createdAt: user registration timestamp
  - **Middleware**:
    - requireAuth: ensures user is authenticated via session
    - requireActiveSub: checks subscription_status is 'active' or 'trialing'
    - requireAdmin: ensures user has 'admin' or 'moderator' role
  - **Storage Methods**:
    - updateUserSubscription: updates Stripe customer/subscription data
    - Auto-creates user stats on registration
  - **Demo Setup**: All demo users have active subscriptions (demo-plan) for testing

- ✅ **Abuse control schema**
  - **Reports Table**: userId, reportedUserId, reason, description, status (pending/reviewed/resolved/dismissed), createdAt
  - **Blocks Table**: blockerId, blockedId, createdAt for user blocking functionality
  - **API Routes**: Ready for implementation (schema complete)

- ✅ **Security & protection**
  - **Rate Limiting**: 
    - General API: 100 requests per 15 minutes
    - Auth endpoints: 5 login/register attempts per 15 minutes
  - **CORS**: Configured for dev (allow all) and prod (specific CLIENT_URL)
  - **Trust Proxy**: Enabled for Replit environment (handles X-Forwarded-For headers)
  - **Secure Cookies**: httpOnly, sameSite: lax, secure in production
  - **Password Safety**: Passwords never returned in API responses

- ⏳ **Stripe integration (awaiting secrets)**
  - Blueprint installed and ready
  - Packages: stripe, bcrypt, express-rate-limit, cors installed
  - Storage methods prepared: updateUserSubscription
  - **Next Steps**: 
    - Request STRIPE_SECRET_KEY and VITE_STRIPE_PUBLIC_KEY from user
    - Implement checkout session creation
    - Add webhook handlers (checkout.session.completed, subscription updates)
    - Create customer portal for subscription management

- ⏳ **Admin console & moderation features (TODO)**
  - Admin role system complete (emma_driver is moderator for testing)
  - Report/block schema ready
  - **Remaining**: API routes for reports/blocks, admin UI dashboard

- ⏳ **Database migration (deferred)**
  - Currently: in-memory MemStorage (resets on server restart)
  - Postgres configured but not migrated
  - **Reason**: Allows rapid MVP iteration, will migrate when stable