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