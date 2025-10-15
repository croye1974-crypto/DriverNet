# Design Guidelines: Trade Plate Driver Lift-Sharing Platform

## Design Approach
**System**: Linear-inspired modern utility design with Uber/Lyft ride-sharing UX patterns
**Justification**: Drivers need quick, efficient matching with clear visual hierarchy for time-sensitive decisions. The design prioritizes speed, clarity, and mobile-first usability.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 220 85% 45% (professional blue)
- Background: 0 0% 98% (soft white)
- Surface: 0 0% 100%
- Text Primary: 220 15% 15%
- Text Secondary: 220 10% 45%
- Success: 142 70% 45% (available/confirmed)
- Warning: 35 90% 55% (time-sensitive)

**Dark Mode:**
- Primary: 220 85% 65%
- Background: 220 20% 8%
- Surface: 220 15% 12%
- Text Primary: 220 10% 95%
- Text Secondary: 220 10% 65%

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Headings**: 600-700 weight, tight tracking
- **Body**: 400-500 weight
- **Scale**: text-sm for metadata, text-base for content, text-lg/xl for headings, text-2xl/3xl for page titles

### Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Consistent card padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Component gaps: gap-4 to gap-6

### Component Library

**Navigation**
- Bottom tab bar (mobile): Fixed bottom-0, 4 primary tabs with icons (Find Lifts, Post Request, Messages, Profile)
- Top header: Minimal with logo/title + notification bell icon

**Cards (Driver/Lift Listings)**
- Elevated white/surface cards with rounded-xl borders
- Driver avatar (left), route info (center), time/distance (right)
- Visual route indicator: Start point → End point with connecting line/arrow
- Clear CTA buttons (Request Lift / View Details)
- Status badges (Available Now, Departing Soon, Full)

**Map Integration**
- Full-width embedded map showing driver locations and routes
- Custom markers for pickup/dropoff points
- Route polyline overlay
- Toggle between list and map view

**Forms (Post Lift Request)**
- Location autocomplete inputs with map pin icons
- Date/time picker with clear visual feedback
- Additional notes textarea
- Prominent "Post Request" button (w-full, py-3)

**Messaging**
- Conversation list with driver avatars
- Real-time message indicators (unread badges)
- In-conversation: Clean chat bubbles, timestamp metadata
- Quick reply suggestions for common coordination phrases

**Profile Components**
- Driver verification badge (checkmark icon)
- Rating stars display
- Trip history cards with route summary
- Vehicle info display (if driver owns vehicle)

### Images
**Hero Section**: No traditional hero - app opens directly to functional dashboard showing nearby available drivers/requests map view. Immediate utility over aesthetics.

**Supporting Images**: 
- Driver profile photos (circular avatars, 48px to 64px)
- Vehicle type icons where relevant
- Empty state illustrations (friendly, minimal line art when no lifts available)

### Interaction Patterns
- Swipe-to-refresh on lists
- Pull-up sheet for driver details (mobile)
- Instant visual feedback on card taps (subtle scale/shadow)
- Loading skeletons for async data
- Toast notifications for confirmations

### Key UX Principles
1. **Speed First**: Minimize taps to post/find lifts (2-3 max)
2. **Location Clarity**: Always show start → end visually
3. **Real-time Updates**: Live status changes, no manual refresh needed
4. **Trust Indicators**: Ratings, verification badges, trip history prominent
5. **Mobile Optimized**: Touch targets 44px minimum, thumb-friendly bottom navigation