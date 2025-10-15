# DriverLift - Trade Plate Driver Ride Sharing Platform

## Overview
A ride-sharing application specifically designed for trade plate car delivery drivers to connect with each other for lifts to their next jobs or public transport links. The app features GPS tracking, scheduling, and real-time location updates to match drivers efficiently.

## Current State
- **Phase**: MVP Development
- **Last Updated**: October 15, 2025
- **Stack**: React + Express + TypeScript + In-Memory Storage

## Core Features

### Implemented
- ✅ Driver profile creation and management
- ✅ Browse available drivers offering lifts
- ✅ Post lift requests
- ✅ Full messaging system with real-time API integration
- ✅ Mobile-first responsive design
- ✅ Dark/light theme support
- ✅ Bottom navigation for mobile
- ✅ Daily schedule management with job input
- ✅ Job check-in/check-out with GPS location capture
- ✅ Automatic driver matching within 10 miles using Haversine formula
- ✅ "Find Nearby Drivers" feature on lift requests
- ✅ Interactive map view toggle for lift requests
- ✅ Robust datetime validation for job creation
- ✅ **Real-time proactive notifications** when drivers check in/out nearby
- ✅ **WebSocket integration** for instant driver location updates

### In Development
- 🔄 Automatic journey time estimation
- 🔄 Full address autocomplete (currently basic postcode lookup)

### Planned (Future)
- Driver ratings and reviews
- Trip history tracking
- Route optimization
- Public transport integration
- Browser push notifications

## Project Architecture

### Frontend (`client/`)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query v5)
- **UI Components**: Shadcn UI + Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **Theme**: Custom design system with dark mode support

### Backend (`server/`)
- **Framework**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage) for MVP
- **API**: RESTful endpoints with Zod validation
- **WebSocket**: Real-time notifications on /ws path

### Shared (`shared/`)
- **Schema**: Drizzle ORM schemas with Zod validation
- Type-safe contracts between frontend and backend

## Data Model

### Current Schema
- **Users**: Driver profiles with authentication
- **Lifts**: Offered rides with routes and availability
- **Requests**: Lift requests from drivers needing rides
- **Messages**: Direct messaging between drivers

### GPS & Scheduling Extensions (In Progress)
- **Schedules**: Daily job schedules with locations
- **Jobs**: Individual delivery jobs with locations
- **Locations**: GPS coordinates and addresses
- **Check-ins**: Track driver progress through jobs
- **Routes**: Calculated routes with time estimates

## Key Dependencies
- `@tanstack/react-query`: Data fetching and caching
- `wouter`: Lightweight routing
- `drizzle-orm`: Type-safe ORM
- `zod`: Schema validation
- `lucide-react`: Icon library
- `react-hook-form`: Form management
- Leaflet (to be installed): Map visualization

## Development Workflow
- Run `npm run dev` to start both frontend and backend
- Frontend: Vite dev server with HMR
- Backend: Express server with tsx watch mode
- All served on same port via Vite middleware

## User Preferences
- Mobile-first design prioritized
- GPS accuracy critical for driver matching
- Quick job check-in/out essential for workflow
- Map view preferred over list for finding nearby drivers

## Recent Changes (October 15, 2025)

### Native Mobile App Design Overhaul ✅
- ✅ Complete design transformation to traditional native mobile app aesthetics (iOS/Android)
  - Updated color system: light gray background (95%) instead of white for native app feel
  - Removed all card borders, using only subtle shadows (shadow-sm) for elevation
  - Tighter spacing between cards (space-y-2 = 8px) for app-like list density
  - Clean headers with bg-card backgrounds (white on gray) - no borders
  - Bottom navigation with shadow-lg instead of border, larger icons (h-6 w-6)
- ✅ Updated all pages to native app layout pattern:
  - FindLifts: Borderless driver cards, clean search header with bg-card
  - Schedule: Floating header with bg-card, tight job card spacing
  - Messages: Native messaging app aesthetic with bg-card headers
- ✅ Design guidelines updated with native mobile app principles
  - Minimal borders philosophy
  - Clean surfaces with subtle elevation
  - Native spacing and typography
  - System font stack (-apple-system, SF Pro, Roboto)

### Schedule Management System
- ✅ Created dedicated Schedule page (replaced Post tab in navigation)
  - Date selector for viewing schedules for any day
  - Add delivery job dialog with GPS location capture
  - Job list showing pickup/delivery locations with status tracking
  - Job status flow: Pending → In Progress → Completed
  - Check-in/out buttons integrated with GPS capture
  - Comprehensive error handling and loading states
  - All interactive elements have test IDs for automated testing

### UK Postcode Lookup Integration
- ✅ Integrated postcodes.io API for UK postcode lookup
  - Free API, no authentication required
  - Auto-fills location name and GPS coordinates from postcode
  - Optional postcode entry - can use GPS instead
  - Clear validation errors if neither postcode nor GPS used
  - Supports all UK postcodes with real geographic data
- ✅ Smart time defaults for today's schedule
  - Start time defaults to next 15-minute interval
  - End time defaults to 2 hours after start
  - Can override for carry-over jobs (next day delivery)
  - Refreshes to current time when dialog opens

### Automatic Driver Matching
- ✅ Implemented automatic driver matching system
  - Jobs now capture GPS location on check-in/check-out
  - Matching algorithm finds drivers within 10 miles (16.09km) using Haversine formula
  - API endpoint `/api/lift-requests/find-matches` with bounded parameters
  - UI component `MatchedDrivers` shows nearby drivers with distance, location, and contact options
  - Integrated into lift request cards with proper error/loading/success states
- ✅ Map view toggle added to Find Lifts page

### Bug Fixes & API Integration
- ✅ Fixed job creation validation to properly handle datetime inputs
  - Schema now uses `z.coerce.date()` for robust string-to-Date conversion
  - Returns proper 400 validation errors instead of 500 server errors
  - Cleaned up debug logging in AddJobDialog
- ✅ Integrated real messaging API replacing mock data
  - Messages page connects to `/api/conversations` and `/api/messages/between` endpoints
  - Added proper loading states during data fetch
  - Error states with user-friendly messages
  - Send message mutation with toast notifications on error
  - Cache invalidation for real-time updates

### Real-Time Proactive Notifications
- ✅ Implemented WebSocket server on `/ws` path for instant updates
- ✅ Automatic notifications when drivers check in/out within 10 miles
  - Server broadcasts check-in/out events with GPS location
  - Client calculates distance using user's last known location
  - Only shows notifications for drivers within 16.09km (10 miles)
  - Notifications auto-dismiss after 10 seconds
  - Shows driver name, location, distance, and quick message button
- ✅ Added `/api/users/:userId/last-location` endpoint
  - Finds user's most recent check-in or check-out location
  - Used for proximity-based notification filtering
  - Refreshes every minute for up-to-date positioning
- ✅ WebSocket auto-reconnect with 3-second delay on disconnect
- ✅ Graceful degradation: shows all notifications if user location unavailable

### Lift Request Confirmation Flow
- ✅ Implemented confirmation dialog for lift requests
  - Click "Request Lift" opens AlertDialog with driver and route details
  - Shows driver name, from/to locations for verification
  - Cancel option to abort request without side effects
  - Confirm button sends request and triggers success feedback
- ✅ Visual feedback system for request status
  - Success toast displays with clear message after confirmation
  - Button updates to "Request Sent" (disabled) after successful request
  - State persists during session to prevent duplicate requests
  - All interactions properly tested with automated playwright tests
