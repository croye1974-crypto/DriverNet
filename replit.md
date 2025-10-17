# DriveNet - Trade Plate Driver Ride Sharing Platform

## Overview
DriveNet is a ride-sharing application designed for trade plate car delivery drivers. Its primary purpose is to connect drivers for shared lifts to their next jobs or public transport. The platform aims to streamline the logistics for delivery drivers by providing features such as GPS tracking, scheduling, real-time location updates, and efficient driver matching. The business vision is to optimize driver workflow, reduce travel inefficiencies, and foster a connected community among professional drivers.

## User Preferences
- I prefer clear and concise explanations.
- I prefer an iterative development approach.
- I prefer to be asked before major architectural changes are made.
- I prefer functional programming paradigms where appropriate.
- Mobile-first design prioritized
- GPS accuracy critical for driver matching
- Quick job check-in/out essential for workflow
- Map view preferred over list for finding nearby drivers

## System Architecture

### UI/UX Decisions
The application prioritizes a native mobile app aesthetic with a light gray background, subtle shadow-based elevation, and clean headers. Spacing is optimized for mobile list density, and bottom navigation uses larger icons. The design maintains a minimalist approach with clean surfaces, native spacing, typography, and a system font stack.

### Technical Implementations
- **Frontend**: React 18 (TypeScript), Wouter, TanStack Query (v5), Shadcn UI + Radix UI, Tailwind CSS, React Hook Form with Zod. Supports dark/light themes.
- **Backend**: Express.js (TypeScript), in-memory storage (MemStorage) for MVP, RESTful endpoints with Zod validation.
- **Shared**: Drizzle ORM schemas with Zod for type-safe contracts.
- **Real-time Communication**: WebSocket integration for instant driver location updates and proactive notifications.
- **Geolocation**: GPS tracking, Haversine formula for driver matching (within 10 miles), postcodes.io for UK postcode lookup.
- **Mapping**: Interactive map with distinct markers, clickable elements, zoom/pan controls, and dynamic marker scaling.
- **Scheduling**: Daily schedule management, job input, check-in/check-out with GPS, job status flow (Pending → In Progress → Completed), robust datetime validation.
- **Messaging**: Full messaging system with real-time API integration.
- **Notifications**: Real-time, proximity-based, and automatic schedule match notifications.
- **Authentication**: bcrypt hashing, `express-session` for session management (30-day cookie lifetime). Includes registration, login, logout.
- **Subscription & Access Control**: User schema includes `stripeCustomerId`, `subscriptionStatus`, `currentPeriodEnd`, `planId`, and `role`. Middleware for authentication, active subscription, and role-based access.
- **Gamification**: Driver ratings, reputation score, tier system, and achievement badges.
- **Driver Identification**: Call sign system (LL#### format) for simplified driver identification.
- **Spell Checking**: Dynamic spell checking for free-text location/place name inputs.
- **Progressive Web App (PWA)**: Complete PWA manifest, service worker for offline support, iOS-specific meta tags, and mobile optimizations for safe areas and touch.

### System Design Choices
The application features clear separation between frontend, backend, and shared components. An in-memory database supports rapid MVP development. WebSockets provide real-time experiences. The design prioritizes mobile-first usability and accessibility.

## External Dependencies
- **Data Fetching/Caching**: `@tanstack/react-query`
- **Routing**: `wouter`
- **ORM**: `drizzle-orm`
- **Schema Validation**: `zod`
- **Icons**: `lucide-react`
- **Form Management**: `react-hook-form`
- **Mapping**: Leaflet
- **External API**: postcodes.io
- **Authentication**: `bcrypt`, `express-session`
- **Payment Processing**: Stripe
- **Testing**: Playwright

## Recent Feature Implementations

### Your Location on Map (Implemented)
- Feature: Always-visible user location marker on map view with enhanced visibility
- Bottom Navigation: Renamed "Find Lifts" to "Map" for clarity
- Location Marker: Purple marker with pulsing purple ring animation (2s ease-out infinite) draws immediate attention
- Visual Components: 
  - Animated pulse ring (purple, semi-transparent, expands outward)
  - Main purple marker (larger than other markers)
  - Red indicator dot (top-right corner)
  - "You" label (white background, purple text, positioned below marker)
- Map Legend: Updated to show "Your Location" (purple), "Lift Offers" (blue), "Lift Requests" (green)
- GPS Integration: Automatic location detection with fallback to Birmingham, UK (52.4862, -1.8904)
- Visibility: User location marker always on top (z-index 1000), responsive to zoom levels
- Test IDs: All components have data-testid attributes (pulse-ring, marker-user-location, red-indicator, you-label)
- Access: Map tab constantly available in bottom navigation for instant location awareness
- Impact: Drivers can see their exact position at all times with clear visual distinction from other markers

### Offer Lift Confirmation (Implemented)
- Feature: Confirmation dialog when offering a lift to a requesting driver
- UI Flow: Click "Offer Lift" → Review details → Confirm or Cancel
- Dialog Content: Shows requester name, route (from/to locations), and clear explanation
- Toast Feedback: "Lift Offer Sent" notification confirms action
- State Management: Tracks offered lifts to prevent duplicate offers
- Consistency: Matches the existing "Request Lift" confirmation pattern
- Impact: Prevents accidental offers and provides clear communication flow

### Driver Profile Details (Implemented)
- Feature: Complete driver profile edit capability with essential contact information
- Schema Updates: Added email and phone fields to users table with proper validation
- Edit Dialog: Enhanced with email (email format validation) and phone (min 10 digits) input fields
- Contact Display: New "Contact Details" card showing email and phone on profile page
- Smart Updates: Only sends changed fields to API, reduces unnecessary updates
- Validation: Email format checked, phone minimum length enforced, empty strings handled as null
- UI/UX: Displays "Not provided" for missing contact details, maintains consistent design patterns
- Impact: Drivers can now provide complete contact information for better communication and coordination

### Flexible Job Location Input (Implemented)
- Feature: Add jobs using town/city names without requiring GPS coordinates or postcode lookup
- Input Options: Three flexible ways to set locations:
  1. Town/City Name: Type "Manchester", "Liverpool", etc. (no coordinates needed)
  2. Postcode Lookup: Enter postcode + click Search button (🔍) for precise coordinates
  3. GPS Location: Click "Use Current Location" for exact GPS coordinates
- Journey Calculation: Optional feature requiring GPS coordinates (via postcode or GPS)
- Validation: Removed mandatory coordinate requirement; locations can be text-only
- UI Updates: Clear messaging when GPS needed for journey calculation
- Reset Button: Easily clear form and start over with Reset button
- Impact: Faster job entry for drivers who know general destinations without needing exact postcodes