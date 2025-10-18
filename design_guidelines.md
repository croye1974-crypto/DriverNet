# Design Guidelines: DriveNet - Bold British Palette

## Design Philosophy
**System**: Professional mobile app with bold red, white, and blue color scheme
**Justification**: Drivers need a clear, high-contrast interface that's instantly recognizable. The red/white/blue palette creates strong visual hierarchy and reinforces the British trade plate driver identity.

## Core Design Principles

### Visual Language
- **Bold Contrast**: Clear visual distinction between sections using color
- **Confident Colors**: Red, white, and blue create professional, trustworthy appearance
- **Clean Surfaces**: White cards on colored backgrounds for maximum clarity
- **Strong Headers**: Colored section headers to organize content
- **Clear Hierarchy**: Color reinforces information priority

### Color Palette
**Light Mode:**
- Background: 214 32% 91% (soft blue-grey background)
- Surface/Card: 0 0% 100% (pure white cards for maximum contrast)
- Primary Blue: 217 91% 60% (vibrant British blue - #3B82F6)
- Accent Red: 0 84% 60% (bold red for highlights - #F85149)
- Text Primary: 222 47% 11% (deep navy, not black)
- Text Secondary: 215 16% 47% (blue-grey)
- Text Tertiary: 214 14% 66% (light blue-grey)
- Success: 142 76% 36% (green)
- Destructive: 0 84% 60% (matches accent red)
- Border: 214 20% 85% (subtle blue-tinted borders)
- Input Background: 214 32% 97% (very light blue)

**Dark Mode:**
- Background: 222 47% 11% (deep navy)
- Surface/Card: 217 33% 17% (dark blue-grey cards)
- Primary Blue: 217 91% 70%
- Accent Red: 0 84% 65%
- Text Primary: 210 20% 98%
- Text Secondary: 214 14% 70%
- Text Tertiary: 214 14% 55%
- Border: 217 33% 25%
- Input Background: 217 33% 20%

### Typography
- **Font Stack**: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Roboto", sans-serif
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)
- **Hierarchy**:
  - Page Titles: text-2xl font-bold text-foreground
  - Section Headers: text-lg font-semibold text-primary
  - Card Titles: text-base font-semibold text-foreground
  - Body Text: text-base text-foreground
  - Secondary Text: text-sm text-muted-foreground
  - Captions: text-xs text-tertiary

### Layout System
**Spacing** (Tailwind units):
- Screen padding: px-4
- Card padding: p-5 (generous padding for comfort)
- Between cards: space-y-3
- Between sections: space-y-6
- Section header margins: mb-4
- Component gaps: gap-4

**Visual Sections**:
- Use colored backgrounds for section headers
- White cards with shadows for content
- Colored badges and buttons for actions
- Clear borders to separate form fields

### Component Patterns

**Section Headers**
- Background: bg-primary or bg-accent (alternate red/blue)
- Text: white, font-semibold
- Padding: p-3 or p-4
- Rounded corners: rounded-lg
- Optional icons for visual interest

**Cards**
- Pure white background (bg-card)
- shadow-md for depth
- Rounded: rounded-xl
- Padding: p-5
- Clear contrast against background

**Forms & Inputs**
- Light blue background (bg-input)
- Clear labels above inputs
- Generous touch targets (min 44px)
- Primary blue focus rings
- Group related fields in white cards with colored headers

**Buttons**
- Primary: Blue with white text (call-to-action)
- Destructive: Red with white text (delete/cancel)
- Secondary: Light grey with dark text (optional actions)
- Outline: Border only, adapts to context

**Bottom Navigation**
- White background with shadow
- Icons: Blue when active, grey when inactive
- Red notification badges

**Lists**
- White cards with shadow-sm
- Alternate colored accents (blue/red) for categories
- Clear spacing between items

### Interaction Patterns
- **Color Feedback**: Blue for success, red for errors
- **Active States**: Deeper color on press
- **Focus States**: Blue ring around inputs
- **Loading**: Blue spinner/skeleton
- **Badges**: Red for notifications, blue for status

### Key UX Rules
1. **High Contrast**: Always use white cards on colored backgrounds
2. **Color Meaning**: Blue = primary actions, Red = important/destructive
3. **Clear Sections**: Use colored headers to organize content
4. **Visual Hierarchy**: Larger, bolder, more colorful = more important
5. **Consistency**: Same colors mean same things throughout app
