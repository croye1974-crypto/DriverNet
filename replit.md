# DriveNet - Trade Plate Driver Ride Sharing Platform

## Overview
DriveNet is a ride-sharing application specifically designed for trade plate car delivery drivers. Its core purpose is to connect these drivers for shared journeys to their next jobs or public transport hubs, thereby optimizing their workflow, reducing travel inefficiencies, and fostering a collaborative community. The platform aims to streamline logistics through features like GPS tracking, scheduling, real-time location updates, and efficient driver matching.

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
The application features a bold, professional mobile design with a red, white, and blue British color palette. The interface uses high-contrast colors: soft blue-grey background (214 32% 91%), pure white cards with shadow-md, vibrant British blue primary buttons (217 91% 60%), and bold red accents (0 84% 60%). Section headers use colored backgrounds (alternating blue/red) with white text to create clear visual hierarchy. Form pages have strong contrast between sections with white cards on colored backgrounds. The design supports both dark and light themes with deep navy backgrounds in dark mode.

### Technical Implementations
- **Frontend**: React 18 (TypeScript), Wouter, TanStack Query (v5), Shadcn UI + Radix UI, Tailwind CSS, React Hook Form with Zod.
- **Backend**: Express.js (TypeScript), in-memory storage (MemStorage) for MVP, RESTful endpoints with Zod validation.
- **Shared**: Drizzle ORM schemas with Zod for type-safe contracts.
- **Real-time Communication**: WebSocket integration for instant location updates and notifications.
- **Geolocation**: GPS tracking, Haversine formula for driver matching (within 10 miles), UK postcode lookup.
- **Mapping**: Interactive map with distinct markers, zoom/pan, and dynamic marker scaling. Includes "Your Location" marker with animated pulse.
- **Scheduling**: Daily schedule management, job input, check-in/check-out with GPS, and robust datetime validation. Automatic 45-minute vehicle inspection time added to job calculations.
- **Journey Time Calculation**: Utilizes Mapbox Directions API for real-time traffic-aware ETAs.
- **Messaging & Notifications**: Full real-time messaging system with proximity-based and automatic schedule match notifications.
- **Authentication**: bcrypt hashing, `express-session` for session management (30-day cookie). Supports registration, login, logout.
- **Subscription & Access Control**: Role-based access control, subscription status management, and Stripe integration for payment.
- **Gamification**: Driver ratings, reputation scores, tier systems, and achievement badges.
- **Driver Identification**: Call sign system (LL#### format).
- **Location Input**: Flexible job location input allowing town/city names, enhanced postcode lookup with full address resolution (ward, district, county, region, postcode), or current GPS.
- **Workflow Guidance**: Single "blue button" system to guide users through sequential actions.
- **Progressive Web App (PWA)**: Complete PWA manifest, service worker for offline support, and iOS-specific optimizations.
- **AI Route Optimization**: Intelligent route planning with driver density analysis and meet-up suggestions using TypeScript algorithms, including nearest-neighbor optimization, Haversine distances, and logistic regression for density scoring.

### System Design Choices
The architecture maintains clear separation between frontend, backend, and shared components. An in-memory database facilitates rapid MVP development, and WebSockets enable real-time interactions. The design prioritizes mobile-first usability and accessibility.

## External Dependencies
- **Data Fetching/Caching**: `@tanstack/react-query`
- **Routing**: `wouter`
- **ORM**: `drizzle-orm`
- **Schema Validation**: `zod`
- **Icons**: `lucide-react`
- **Form Management**: `react-hook-form`
- **Mapping**: Leaflet
- **External APIs**: postcodes.io (UK postcode lookup), Mapbox Directions API (real-time traffic routing)
- **Authentication**: `bcrypt`, `express-session`
- **Payment Processing**: Stripe
- **Testing**: Playwright
### Real-Time Traffic Integration with Mapbox (October 2025)
- Feature: Live traffic-aware journey time calculation replacing fixed-speed estimates
- API Integration: Mapbox Directions API with `driving-traffic` profile for UK road conditions
- Backend Endpoint: POST `/api/calculate-journey` accepts coordinates, returns traffic-aware ETAs
- Vehicle Inspection Time: Automatic 45-minute inspection period added to all jobs (regulatory requirement for trade plate deliveries)
- Journey Calculation Formula: Total job time = Mapbox driving time + 45 minutes inspection
- Frontend Updates: `AddJobDialog` now calls Mapbox API when "Calculate Journey" button clicked
- Loading States: Spinner displays during API call ("Calculating...")
- Traffic Models: Uses "BEST_GUESS" mode blending live traffic + historical patterns
- Distance Conversion: Mapbox returns meters → converted to miles for UK consistency
- Error Handling: Toast notifications for API failures with fallback guidance
- Environment Variable: `MAPBOX_API_KEY` stored securely in Replit Secrets (required for API access)
- Realistic ETAs: Examples - London to Manchester rush hour: ~5h total (4h15m drive + 45m inspection) vs. off-peak: ~4h total (3h15m drive + 45m inspection)
- **Cost Analysis**:
  - Mapbox Free Tier: 100,000 API requests per month included at no cost
  - Beyond Free Tier: £2.00 per 1,000 requests (at current exchange rates)
  - Projected Monthly Usage: ~9,000 requests (calculation: 3 jobs/driver/day × 100 active drivers × 30 days = 9,000 journey calculations/month)
  - Expected Monthly Cost: £0.00 (well within 100K free tier limit)
  - Cost at 10x Scale (1,000 drivers): ~90K requests/month = still £0.00
  - Cost at 20x Scale (2,000 drivers): ~180K requests/month = 80K × £2/1K = £160/month
  - Rate Limit: 300 requests/minute (sufficient for current and near-term projected usage)
- Impact: Drivers now see accurate journey times accounting for real-world UK traffic conditions and mandatory inspection procedures

### Inspection Time Information Dialog (October 2025)
- Feature: Informational alert appears when clicking "Calculate Journey" for the first time
- Message: Explains that the system automatically includes 45 minutes for mandatory vehicle inspection
- User Option: "Don't show this message again" checkbox allows permanent dismissal
- Persistence: Preference saved to localStorage (key: "hideInspectionInfo")
- Behavior: After dismissal, subsequent "Calculate Journey" clicks proceed immediately without dialog
- UI Components: Alert dialog with Clock icon, clear explanation, checkbox, and "Understood" button
- Impact: Ensures drivers understand the inspection time is included while allowing power users to skip the message after first viewing

### Bold Red, White, Blue Design Update (October 2025)
- **Design Overhaul**: Replaced muted grey aesthetic with high-contrast British color palette
- **Color Scheme (WCAG AA Compliant)**:
  - Background: Soft blue-grey (214 32% 91%) for reduced eye strain
  - Cards: Pure white (0 0% 100%) for maximum contrast and readability
  - Primary Actions: Vibrant British blue (217 91% 48%) - ≥4.5:1 contrast with white text
  - Accent/Destructive: Bold red (0 84% 48%) - ≥4.5:1 contrast with white text
  - Text: Deep navy (222 47% 11%) instead of black for softer appearance
- **Visual Hierarchy**: Section headers with colored backgrounds (alternating blue/red) and white text
  - FindLifts: Blue header for "Available Lift Offers", red header for "Lift Requests"
  - Profile: Red badges for free tier and low punctuality warnings
  - Schedule: Blue header for "Today's Delivery Jobs"
- **Form Design**: White cards on colored backgrounds for strong contrast between sections
- **Dark Mode**: Deep navy background (222 47% 11%) with blue-grey cards (217 33% 17%)
- **Accessibility**: All colored backgrounds with white text meet WCAG AA 4.5:1 contrast requirement
- **Impact**: Eliminates "bland grey" appearance with professional, trustworthy British identity that improves usability and visual appeal while maintaining accessibility standards
