# Contributing to NorthStar Sports

Thank you for your interest in contributing to NorthStar Sports! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct (see CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- PostgreSQL database (or Supabase account)
- Git

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/NSSPORTS.git
   cd NSSPORTS
   ```

2. **Install dependencies**
   ```bash
   cd next_frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or updates
- `chore/description` - Maintenance tasks

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or updates
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples:**
```
feat(api): add user authentication endpoint
fix(ui): resolve mobile navigation overflow issue
docs(readme): update installation instructions
```

### Code Style

- **TypeScript**: We use TypeScript for type safety
- **Formatting**: Code is automatically formatted with Prettier
- **Linting**: ESLint is configured for code quality
- **Naming Conventions**:
  - Components: PascalCase (e.g., `GameCard.tsx`)
  - Files: camelCase or kebab-case
  - Variables/Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Types/Interfaces: PascalCase

### Testing

Before submitting a pull request:

1. **Run linting**
   ```bash
   npm run lint
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Test your changes**
   - Manually test all affected functionality
   - Verify responsive design on mobile, tablet, and desktop
   - Check browser console for errors

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Follow the code style guidelines
   - Add comments where necessary
   - Update documentation if needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description of changes"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template with:
     - Description of changes
     - Related issue number (if applicable)
     - Screenshots (for UI changes)
     - Testing steps

6. **PR Review Process**
   - Maintainers will review your PR
   - Address any requested changes
   - Once approved, your PR will be merged

## Project Structure

```
NSSPORTS/
├── next_frontend/           # Main Next.js application
│   ├── src/
│   │   ├── app/            # Next.js App Router pages & API routes
│   │   ├── components/     # React components
│   │   ├── context/        # React Context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript type definitions
│   ├── prisma/             # Database schema and seeds
│   └── public/             # Static assets
└── docs/                   # Documentation
```

## Areas for Contribution

### High Priority
- [ ] User authentication and authorization
- [ ] Real-time live game updates (WebSocket)
- [ ] Bet placement API and processing
- [ ] Payment integration
- [ ] User profile management

### Medium Priority
- [ ] Enhanced betting analytics
- [ ] Social features (sharing bets, leaderboards)
- [ ] Push notifications
- [ ] Email notifications
- [ ] Advanced filtering and search

### Low Priority
- [ ] Dark/light theme toggle
- [ ] Internationalization (i18n)
- [ ] Accessibility improvements
- [ ] Performance optimizations
- [ ] Additional sports and leagues

## Documentation

When adding new features or making significant changes:

1. Update inline code comments
2. Update relevant markdown documentation
3. Add JSDoc comments for public APIs
4. Update the README if necessary

## API Guidelines

### Endpoint Structure
- Use RESTful conventions
- Version your APIs (`/api/v1/...`)
- Return consistent error responses
- Include proper status codes

### Error Handling
```typescript
return NextResponse.json(
  { error: 'Description of error', code: 'ERROR_CODE' },
  { status: 400 }
);
```

### Response Format
```typescript
{
  data: [...],
  pagination?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  meta?: {
    timestamp: string
  }
}
```

## Database Changes

1. **Schema Changes**
   - Update `prisma/schema.prisma`
   - Generate migration: `npm run db:generate`
   - Apply migration: `npm run db:push`

2. **Seed Data**
   - Update `prisma/seed.ts` if needed
   - Test with: `npm run db:seed`

## Questions?

If you have questions about contributing:

1. Check existing issues and documentation
2. Open a new issue with the `question` label
3. Join our discussions in GitHub Discussions

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes for significant contributions
- Special mentions for exceptional contributions

Thank you for helping make NorthStar Sports better!

---

**Last Updated**: January 2025
