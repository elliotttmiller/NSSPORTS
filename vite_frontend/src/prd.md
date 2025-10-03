# NSSPORTSCLUB - Professional Sports Betting Platform

## Core Purpose & Success

- **Mission Statement**: Create the definitive professional sports betting studio with unified desktop and mobile experiences that feel like industry-leading applications.
- **Success Indicators**: Seamless cross-device experience, smooth interactions, professional UI polish, and intuitive betting workflows.
- **Experience Qualities**: Professional, Fluid, Intuitive

## Project Classification & Approach

- **Complexity Level**: Complex Application (advanced functionality, synchronized state)
- **Primary User Activity**: Creating (building bet slips), Acting (placing bets), Interacting (with live odds)

## Essential Features

- **Unified Bet Slip Builder**: Single workflow for straight bets, parlays, and player props
- **Responsive Game Cards**: Space-efficient cards with expandable player props
- **Floating Bet Slip Button**: Mobile-only draggable access to current bet slip
- **Synchronized Navigation**: Seamless desktop 3-panel and mobile sequential experience
- **Virtual Scrolling**: Smooth, infinite scroll for all panels without page-level scrolling

## Design Direction

### Visual Tone & Identity

- **Emotional Response**: Confidence, professionalism, and control
- **Design Personality**: Sleek, modern, industry-standard
- **Visual Metaphors**: Financial dashboard meets sports analytics
- **Simplicity Spectrum**: Minimal interface that prioritizes content and actions

### Color Strategy

- **Color Scheme Type**: Refined dark theme with subtle blue accents
- **Primary Color**: Professional blue (#7C3AED) for actions and highlights
- **Secondary Colors**: Dark grays and subtle borders for structure
- **Accent Color**: Blue for CTAs and active states
- **Background**: Deep dark gray/black (#0f172a) for main areas
- **Card backgrounds**: Subtle dark gray (#1e293b) with transparency

### Typography System

- **Font Pairing Strategy**: Inter for all text (clean, professional)
- **Typographic Hierarchy**: Clear size relationships for different content levels
- **Font Personality**: Clean, modern, highly legible
- **Which fonts**: Inter from Google Fonts
- **Legibility Check**: Excellent legibility across all sizes

### UI Elements & Component Selection

- **Component Usage**: shadcn/ui components styled for dark theme
- **Game Cards**: Compact, expandable cards with betting options
- **Navigation**: Collapsible desktop panels, slide-out mobile panels
- **Bet Slip**: Modal overlay on mobile, sidebar panel on desktop
- **Floating Button**: Draggable bet slip access on mobile only

## Implementation Considerations

- **Responsive Design**: Tailwind's responsive utilities for breakpoint-specific layouts
- **Virtual Scrolling**: Smooth panel scrolling without page-level scroll
- **State Synchronization**: React Context for navigation and bet slip state
- **Performance**: Optimized re-renders and smooth animations

## Current Status

Application rebuilt with Vite + React + TypeScript + shadcn/ui stack. Now optimizing both desktop and mobile experiences for professional polish and functionality.
