# DriveNet - Trade Plate Driver Ride Sharing Platform

## Overview
DriveNet is a ride-sharing application designed for trade plate car delivery drivers. Its primary purpose is to connect drivers for shared lifts to their next jobs or public transport. The platform aims to streamline the logistics for delivery drivers by providing features such as GPS tracking, scheduling, real-time location updates, and efficient driver matching. The business vision is to optimize driver workflow, reduce travel inefficiencies, and foster a connected community among professional drivers. Key capabilities include driver profile management, lift request/offer browsing, automatic driver matching, job check-in/check-out with GPS, real-time messaging and notifications, and map visualization.

## User Preferences
- Mobile-first design prioritized
- GPS accuracy critical for driver matching
- Quick job check-in/out essential for workflow
- Map view preferred over list for finding nearby drivers
- I prefer clear and concise explanations.
- I prefer an iterative development approach.
- I prefer to be asked before major architectural changes are made.
- I prefer functional programming paradigms where appropriate.

## System Architecture

### UI/UX Decisions
The application prioritizes a native mobile app aesthetic with a light gray background, subtle shadow-based elevation, and clean headers. Spacing is optimized for mobile list density, and bottom navigation uses larger icons. The design maintains a minimalist approach with clean surfaces, native spacing, typography, and a system font stack. Interactive elements have test IDs for automated testing.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query (v5) for state management, Shadcn UI + Radix UI for components, Tailwind CSS for styling, and React Hook Form with Zod for forms. Supports dark/light themes.
- **Backend**: Express.js with TypeScript, utilizing in-memory storage (MemStorage) for MVP and RESTful endpoints with Zod validation.
- **Shared**: Drizzle ORM schemas with Zod for type-safe contracts.
- **Real-time Communication**: WebSocket integration for instant driver location updates and proactive notifications.
- **Geolocation**: GPS tracking with fallback, Haversine formula for driver matching within 10 miles, and postcodes.io for UK postcode lookup.
- **Mapping**: Interactive map view with distinct markers for lift offers (blue) and requests (green), clickable markers, zoom/pan controls, and a legend. Dynamic marker scaling prevents overcrowding on mobile.
- **Scheduling**: Daily schedule management with job input, check-in/check-out with GPS capture, and a job status flow (Pending → In Progress → Completed). Robust datetime validation.
- **Messaging**: Full messaging system with real-time API integration, conversation search, and ordering.
- **Notifications**: Real-time proactive, proximity-based notifications for nearby driver check-ins/outs. Includes automatic schedule match notifications for drivers at the same destination (within 3km) at a similar time (within 60 minutes).
- **Concurrency**: Vite dev server for frontend with HMR, Express server with tsx watch mode, served on the same port via Vite middleware.
- **Authentication**: bcrypt hashing (10 salt rounds), `express-session` for session management (30-day cookie lifetime). Includes registration, login, logout, and current user endpoints.
- **Subscription & Access Control**: User schema includes `stripeCustomerId`, `subscriptionStatus`, `currentPeriodEnd`, `planId`, and `role` (`user`, `moderator`, `admin`). Middleware for authentication, active subscription, and role-based access.
- **Abuse Control**: Schemas for `Reports` (userId, reportedUserId, reason, status) and `Blocks` (blockerId, blockedId) for future implementation.
- **Security & Production Infrastructure**: 
  - **Helmet**: Security headers (CSP disabled in dev for Vite HMR)
  - **Compression**: Gzip compression for responses
  - **Rate Limiting**: Separate limiters for API (100/15min), auth (5/15min), and webhooks (20/min)
  - **Session Store**: Postgres for production (connect-pg-simple), Memory for development
  - **Named Session**: Cookie named "dn.sid" for better tracking
  - **CORS**: Environment-aware (locked down in production)
  - **Trust Proxy**: Enabled for Replit/proxy environments
  - **Secure Cookies**: httpOnly, sameSite: lax, secure in production
  - **Request Limits**: 1MB JSON/urlencoded, 500KB raw webhook body
  - **Error Handling**: Structured error middleware with stack traces in dev
  - **Password Safety**: Never returned in API responses
- **Gamification**: Driver ratings (1-5 stars with KPIs), a reputation score (0-100), a tier system (Bronze, Silver, Gold, Platinum), and achievement badges (Milestone, Quality, Community, Safety).
- **Driver Identification**: Call sign system (LL#### format) for simplified driver identification, automatically generated on user creation and displayed across various UI elements.
- **Spell Checking**: Dynamic spell checking enabled for free-text location/place name inputs, disabled for postcode inputs.
- **Progressive Web App (PWA)**:
  - **Manifest**: Complete PWA manifest with app metadata, icons (192px, 512px maskable), theme colors, and app shortcuts
  - **Service Worker**: Offline support with install precache, activate cleanup, and network-first runtime caching strategy
  - **iOS Support**: Apple-specific meta tags for web app capability, status bar styling, and touch icon
  - **Safe Areas**: CSS variables for iOS notched devices (iPhone X+) with proper viewport-fit configuration
  - **Mobile Optimizations**: Dynamic viewport height (dvh), overscroll prevention, touch scrolling enhancements
  - **Installation**: App installable as native mobile app on both iOS and Android with offline functionality

### System Design Choices
The application features clear separation between frontend, backend, and shared components for maintainability and scalability. An in-memory database supports rapid MVP development. WebSockets provide real-time experiences. The design prioritizes mobile-first usability and accessibility.

## External Dependencies
- **Data Fetching/Caching**: `@tanstack/react-query`
- **Routing**: `wouter`
- **ORM**: `drizzle-orm`
- **Schema Validation**: `zod`
- **Icons**: `lucide-react`
- **Form Management**: `react-hook-form`
- **Mapping**: Leaflet
- **External API**: postcodes.io (for UK postcode lookup)
- **Authentication**: `bcrypt`, `express-session`
- **Payment Processing**: Stripe (for subscriptions, checkout sessions, webhooks, customer portal)