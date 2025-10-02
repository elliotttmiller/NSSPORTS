# NorthStar Sports - Frontend

React/TypeScript frontend for the NorthStar Sports betting platform.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm install

# Copy environment template (if needed)
cp .env.example .env.local
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run test suite
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🏗️ Architecture

### Directory Structure

```
src/
├── components/     # React components
│   ├── ui/         # Base UI components (shadcn/ui)
│   ├── layouts/    # Layout components
│   ├── panels/     # Panel components
│   └── player-props/ # Player props specific components
├── context/        # React Context providers
├── hooks/          # Custom React hooks
├── lib/            # Utility libraries and helpers
├── pages/          # Route/page components
├── services/       # API service functions
├── types/          # TypeScript type definitions
└── assets/         # Static assets
```

### Key Technologies

- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **React Query**: Data fetching and caching
- **React Router**: Client-side routing

## 🎨 Component System

### UI Components (shadcn/ui)

Pre-built, customizable components based on Radix UI:

- `Button`, `Input`, `Card`, `Dialog`
- `Table`, `Tabs`, `Select`, `Checkbox`
- `Tooltip`, `Popover`, `Dropdown Menu`
- And many more...

### Custom Components

Application-specific components:

- `GameCard` - Displays game information and betting options
- `BetSlipModal` - Bet slip interface
- `TeamLogo` - Team logo display component
- `OddsButton` - Interactive betting odds buttons
- `WorkspacePanel` - Main game display area

### Layout Components

- `RootLayout` - Application shell
- `Header` - Top navigation
- `BottomNav` - Mobile navigation
- `Sidebar` - Desktop navigation

## 📱 Responsive Design

### Mobile-First Approach

- Components adapt from mobile to desktop
- Touch-friendly interfaces
- Optimized for various screen sizes

### Key Breakpoints

```css
sm: 640px    /* Small tablets */
md: 768px    /* Tablets */
lg: 1024px   /* Small laptops */
xl: 1280px   /* Large laptops */
2xl: 1536px  /* Large screens */
```

### Mobile-Specific Components

- `CompactMobileGameRow` - Mobile game display
- `MobileBetSlipPanel` - Mobile bet slip
- `FloatingBetSlipButton` - Mobile bet slip trigger

## 🎯 State Management

### React Context

Global state management using React Context:

- `UserContext` - User authentication and profile
- `BetSlipContext` - Bet slip state and operations
- `NavigationContext` - Navigation state
- `BetsContext` - User's betting history

### Custom Hooks

Reusable stateful logic:

- `useApi` - API calls and error handling
- `useIsMobile` - Responsive design utilities
- `useInfiniteScroll` - Infinite scrolling
- `useKV` - Key-value store operations
- `usePlayerProps` - Player props data

### Data Fetching

React Query for server state management:

```typescript
// Example usage
const { data: games, isLoading } = useQuery({
  queryKey: ["games", sport],
  queryFn: () => fetchGamesBySport(sport),
});
```

## 🎨 Styling System

### TailwindCSS Configuration

```javascript
// Custom theme extensions
theme: {
  extend: {
    colors: {
      border: "hsl(var(--border))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      // ... more custom colors
    }
  }
}
```

### CSS Variables

Design tokens for consistent theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 98%;
}
```

### Animation System

Framer Motion for smooth animations:

```typescript
// Example animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

## 🔧 Development Tools

### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm test                 # Run Jest tests
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks
npm run lint-and-type-check  # Run both linting and type checking
```

### Code Quality

- **ESLint**: React and TypeScript linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Jest**: Unit testing with React Testing Library

### Build Configuration

Vite configuration with optimizations:

- Code splitting
- Tree shaking
- Asset optimization
- TypeScript path aliases

## 📡 API Integration

### Service Layer

Organized API calls in service files:

```typescript
// services/gameService.ts
export const gameService = {
  getGames: () => api.get("/games"),
  getGameById: (id: string) => api.get(`/games/${id}`),
  getGamesBySport: (sport: string) => api.get(`/games/sport/${sport}`),
};
```

### Error Handling

Centralized error handling with user feedback:

```typescript
try {
  await gameService.getGames();
} catch (error) {
  showErrorToast("Failed to load games");
  logger.error("API Error", error);
}
```

## 🎮 User Experience

### Key Features

- **Responsive Design**: Optimized for all devices
- **Smooth Animations**: Framer Motion transitions
- **Real-time Updates**: Live betting odds
- **Offline Support**: Service worker caching
- **Accessibility**: ARIA labels and keyboard navigation

### Performance Optimizations

- **Code Splitting**: Route-based splitting
- **Lazy Loading**: Component lazy loading
- **Virtual Scrolling**: Large list optimization
- **Image Optimization**: Responsive images
- **Bundle Analysis**: Size monitoring

## 🚀 Deployment

### Build Process

```bash
# Production build
npm run build

# Build output in dist/
dist/
├── assets/         # Optimized assets
├── index.html      # Entry point
└── ...            # Other build files
```

### Environment Variables

```bash
# .env.local
VITE_API_URL=http://localhost:4000
VITE_APP_ENV=development
```

### Static Hosting

Deploy to any static hosting service:

- **Vercel**: Zero-config deployment
- **Netlify**: Continuous deployment
- **AWS S3/CloudFront**: Scalable hosting
- **GitHub Pages**: Free hosting

## 🧪 Testing Strategy

### Unit Tests

Component and utility testing:

```typescript
import { render, screen } from '@testing-library/react';
import { GameCard } from '../GameCard';

test('renders game information', () => {
  render(<GameCard game={mockGame} />);
  expect(screen.getByText('Lakers vs Warriors')).toBeInTheDocument();
});
```

### Integration Tests

Context and hook testing:

```typescript
test("bet slip adds and removes bets", () => {
  const { result } = renderHook(() => useBetSlip());
  act(() => {
    result.current.addBet(mockBet);
  });
  expect(result.current.betSlip.bets).toHaveLength(1);
});
```

## 📱 PWA Features

### Service Worker

Offline functionality and caching:

- Cache API responses
- Offline page display
- Background sync

### Manifest

App-like installation:

```json
{
  "name": "NorthStar Sports",
  "short_name": "NorthStar",
  "theme_color": "#000000",
  "icons": [...]
}
```

## 🤝 Contributing

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Make changes and test
5. Submit pull request

### Code Style Guidelines

- Use TypeScript for all new components
- Follow existing naming conventions
- Write tests for new features
- Use semantic commit messages
- Update documentation

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Guide](https://www.framer.com/motion/)
- [Vite Guide](https://vitejs.dev/guide/)

---

For questions or support, please refer to the main project documentation or open an issue.
