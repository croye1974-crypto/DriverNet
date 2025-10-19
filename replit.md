# DriveNet - Trade Plate Driver Ride Sharing Platform

## Overview
DriveNet is a ride-sharing platform specifically designed for trade plate car delivery drivers, aiming to optimize their workflow and foster a collaborative community. It connects drivers for shared journeys to their next jobs or public transport hubs, reducing travel inefficiencies. The platform also expands to support low-loader operators, passengers, and businesses, evolving into a comprehensive transport marketplace for ride-sharing, vehicle transport, and corporate logistics. Key capabilities include GPS tracking, real-time location updates, efficient driver matching, and intelligent route optimization.

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
The application features a bold, professional mobile design utilizing a British red, white, and blue color palette. It uses high-contrast colors: a soft blue-grey background, pure white cards with shadows, vibrant British blue primary buttons, and bold red accents. Section headers use alternating colored backgrounds with white text for clear visual hierarchy. The design supports both dark and light themes, prioritizing mobile-first usability and accessibility.

### Technical Implementations
- **Frontend**: React 18 (TypeScript), Wouter, TanStack Query (v5), Shadcn UI + Radix UI, Tailwind CSS, React Hook Form with Zod.
- **Backend**: Express.js (TypeScript), in-memory storage (MemStorage) for MVP, RESTful endpoints with Zod validation.
- **Shared**: Drizzle ORM schemas with Zod for type-safe contracts.
- **Real-time Communication**: WebSocket integration for instant location updates and notifications.
- **Geolocation**: GPS tracking, Haversine formula for driver matching, UK postcode lookup.
- **Mapping**: Interactive map with distinct markers, zoom/pan, and dynamic marker scaling.
- **Scheduling**: Daily schedule management, job input, check-in/check-out with GPS, including automatic 45-minute vehicle inspection time.
- **Journey Time Calculation**: Utilizes Mapbox Directions API for real-time traffic-aware ETAs.
- **Messaging & Notifications**: Real-time messaging system with proximity-based and automatic schedule match notifications.
- **Authentication**: bcrypt hashing, `express-session` for session management.
- **Subscription & Access Control**: Role-based access control, subscription management, and Stripe integration.
- **Gamification**: Driver ratings, reputation scores, tier systems, and achievement badges.
- **Driver Identification**: Call sign system (LL#### format).
- **Location Input**: Flexible job location input supporting town/city names, enhanced postcode lookup, or current GPS.
- **Workflow Guidance**: Single "blue button" system for sequential actions.
- **Progressive Web App (PWA)**: Complete PWA manifest, service worker for offline support, and iOS-specific optimizations.
- **AI Route Optimization**: Intelligent route planning using TypeScript algorithms including nearest-neighbor optimization and logistic regression.
- **Role Management**: Supports four user roles: `driver` (trade plate delivery), `lowloader` (flatbed/low-loader operators), `liftseeker` (passengers requesting rides), and `business` (companies booking transport services).
- **Unified Interface**: Restructured UI with Map, Post, Matches, and Inbox tabs for a coherent workflow.

### System Design Choices
The architecture emphasizes clear separation between frontend, backend, and shared components. An in-memory database facilitates rapid MVP development, with WebSockets enabling real-time interactions. The design is mobile-first, focusing on usability and accessibility. The system is designed to support a multi-role ecosystem for various transport needs.

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