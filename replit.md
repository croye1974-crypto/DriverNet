# DriverLift - Trade Plate Driver Ride Sharing Platform

## Overview
A ride-sharing application specifically designed for trade plate car delivery drivers to connect with each other for lifts to their next jobs or public transport links. The app features GPS tracking, scheduling, and real-time location updates to match drivers efficiently.

## Current State
- **Phase**: MVP Development
- **Last Updated**: October 15, 2025
- **Stack**: React + Express + TypeScript + In-Memory Storage

## Core Features

### Implemented (Design Prototype)
- ✅ Driver profile creation and management
- ✅ Browse available drivers offering lifts
- ✅ Post lift requests
- ✅ Basic messaging system
- ✅ Mobile-first responsive design
- ✅ Dark/light theme support
- ✅ Bottom navigation for mobile

### In Development
- 🔄 GPS location tracking and sharing
- 🔄 Interactive map view for driver locations
- 🔄 Daily schedule input with job locations
- 🔄 Automatic journey time estimation
- 🔄 Job check-in/check-out functionality
- 🔄 Real-time driver position updates

### Planned (Future)
- Real-time notifications
- Driver ratings and reviews
- Trip history tracking
- Route optimization
- Public transport integration
- Push notifications

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
- **WebSocket**: For real-time messaging (planned)

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

## Recent Changes
- Initial design prototype completed
- GPS and scheduling features in development
- Map integration planning phase
