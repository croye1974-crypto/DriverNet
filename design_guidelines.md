# Design Guidelines: DriverLift - Native Mobile App Experience

## Design Philosophy
**System**: iOS/Android native app aesthetics with ride-sharing UX patterns (Uber, Lyft, WhatsApp)
**Justification**: Drivers need an instant, familiar mobile experience with zero learning curve. The design mimics native platform conventions for maximum usability and trust.

## Core Design Principles

### Visual Language
- **Minimal Borders**: No heavy borders on cards - use subtle shadows and background contrast instead
- **Clean Surfaces**: Cards float on background with subtle elevation, not outlined boxes
- **Native Spacing**: Generous padding, breathing room between elements
- **System Fonts**: -apple-system, SF Pro, Roboto for native feel
- **Flat & Fast**: Minimal decorative elements, maximum content clarity

### Color Palette
**Light Mode:**
- Background: 0 0% 95% (light gray, not white - native apps rarely use pure white backgrounds)
- Surface/Card: 0 0% 100% (white cards on gray background)
- Primary: 220 85% 50% (iOS blue-inspired)
- Text Primary: 0 0% 13% (near black)
- Text Secondary: 0 0% 45% (medium gray)
- Text Tertiary: 0 0% 60% (light gray for metadata)
- Divider: 0 0% 90% (subtle separators)
- Success: 142 76% 36% (iOS green)
- Destructive: 0 76% 50% (iOS red)

**Dark Mode:**
- Background: 0 0% 0% (true black for OLED)
- Surface/Card: 0 0% 10% (elevated surfaces)
- Primary: 220 85% 60%
- Text Primary: 0 0% 92%
- Text Secondary: 0 0% 65%
- Text Tertiary: 0 0% 50%
- Divider: 0 0% 20%

### Typography
- **Font Stack**: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Roboto", sans-serif
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)
- **Hierarchy**:
  - Navigation Titles: text-lg font-semibold
  - Section Headers: text-base font-semibold
  - Primary Text: text-base font-normal
  - Secondary Text: text-sm text-muted-foreground
  - Captions: text-xs text-tertiary

### Layout System
**Spacing** (Tailwind units):
- Screen padding: px-4 (consistent app margins)
- Card padding: p-4
- Between cards: space-y-2 (tight, app-like list feel)
- Between sections: space-y-6
- Component internal gaps: gap-3

**Safe Areas**:
- Top: Account for status bar and header
- Bottom: Space for bottom navigation (16 height + safe area)
- Horizontal: Consistent 16px margins

### Component Patterns

**Navigation**
- **Bottom Tab Bar**: Fixed, 4 tabs, icons + labels, active state with color change
- **Top Header**: Clean title + optional action button, no heavy styling
- **No visible borders**: Use background color changes instead

**Cards (List Items)**
- No borders, just shadow-sm for subtle elevation
- Background: white (light) / elevated surface (dark)
- Rounded: rounded-xl for modern feel
- Padding: p-4 consistent
- Tap feedback: subtle scale on press
- Look like native iOS/Android list cells

**Driver/Lift Cards**
- Avatar (left, 48px)
- Content (center, flex-grow)
- Metadata (right, time/distance)
- Route visual: Simple icon-based start → end
- CTA button: Full width or inline, native style

**Forms & Inputs**
- Native-style input fields with background fill
- Clear touch targets (min 44px height)
- Labels above inputs (iOS style) or floating
- Minimal borders, use background color instead

**Bottom Sheet / Modals**
- Slide up from bottom with backdrop
- Rounded top corners
- Drag handle for dismissal
- Native animation timing

**Lists**
- No card borders in lists
- Dividers between items (1px hairline)
- Swipe actions where appropriate
- Pull to refresh feel

### Interaction Patterns
- **Instant Feedback**: Visual response within 16ms
- **Native Gestures**: Swipe, tap, long-press where expected
- **Smooth Transitions**: 200-300ms ease curves
- **Loading States**: Skeleton screens, not spinners
- **Empty States**: Friendly, helpful messaging with action prompts

### Shadows & Elevation
- **Level 0**: No shadow (flush with background)
- **Level 1**: shadow-sm (default cards)
- **Level 2**: shadow-md (modals, popovers)
- **Level 3**: shadow-lg (important dialogs)

### Status Indicators
- **Badges**: Small, pill-shaped, right-aligned
- **Dots**: 8px circle for notification counts
- **Icons**: Lucide icons, 20px standard size

### Key UX Rules
1. **Thumb Zone**: Critical actions in bottom 50% of screen
2. **One Action**: Primary button always clear and prominent
3. **Context Aware**: Show relevant info based on user state
4. **Instant Updates**: Real-time without manual refresh
5. **Forgiving**: Easy undo, clear confirmation for destructive actions
