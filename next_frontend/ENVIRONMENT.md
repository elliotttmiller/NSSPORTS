# Environment Variables - Professional Configuration Guide

## Overview

This application uses industry-standard environment variable management following Next.js best practices and security standards.

## Environment Files

### File Hierarchy (in order of precedence)

1. `.env.local` - **Local development** (highest priority, never committed)
2. `.env.development` - Development defaults (can be committed)
3. `.env.production` - Production defaults (can be committed)
4. `.env` - Default values (can be committed)

### File Descriptions

- **`.env.example`** - Template file showing all available variables (COMMIT THIS)
- **`.env.local`** - Your local configuration with real values (NEVER COMMIT)
- **`.env.development`** - Shared development defaults (safe to commit)
- **`.env.production`** - Production configuration (safe to commit without secrets)

## Setup Instructions

### 1. First Time Setup

```bash
# Copy the example file to create your local environment
cp .env.example .env.local

# Edit .env.local with your actual values
nano .env.local  # or use your preferred editor
```

### 2. Required Variables

```env
# Database (required for API routes)
DATABASE_URL="your_supabase_pooler_url"
DIRECT_URL="your_supabase_direct_url"

# CORS (required for ngrok/external access)
ALLOWED_ORIGINS="http://localhost:3000,http://nssportsclub.ngrok.app,https://nssportsclub.ngrok.app"
```

### 3. Public Variables (NEXT_PUBLIC_*)

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser:

```env
NEXT_PUBLIC_APP_URL="http://nssportsclub.ngrok.app"
NEXT_PUBLIC_API_BASE_URL="/api"
NEXT_PUBLIC_APP_NAME="NorthStar Sports"
```

⚠️ **Never put secrets in NEXT_PUBLIC_* variables!**

## Next.js Environment Loading

### Automatic Loading

Next.js automatically loads environment variables in this order:

1. Process environment variables
2. `.env.local`
3. `.env.development` or `.env.production` (based on NODE_ENV)
4. `.env`

**No additional packages required!** Next.js handles this natively.

### How It Works

```typescript
// Server-side (API routes, server components)
const dbUrl = process.env.DATABASE_URL; // ✅ Available

// Client-side (browser)
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL; // ✅ Available
const dbUrl = process.env.DATABASE_URL; // ❌ Undefined (security feature)
```

## CORS Configuration

### Implementation

CORS is configured at multiple levels for maximum security:

1. **Middleware** (`src/middleware.ts`) - Global request interceptor
2. **Environment Variables** - Flexible origin configuration
3. **Development Mode** - Permissive for testing

### CORS Flow

```
Request → Middleware → Check Origin → Set Headers → Route Handler
```

### Allowed Origins

Configure in `.env.local`:

```env
ALLOWED_ORIGINS="http://localhost:3000,http://nssportsclub.ngrok.app,https://nssportsclub.ngrok.app"
```

**Format:** Comma-separated, no spaces

### Development vs Production

**Development:**
- Allows all origins (permissive for testing)
- Logs CORS headers
- Flexible configuration

**Production:**
- Strict origin checking
- Only allowed origins accepted
- Security-first approach

## Security Best Practices

### ✅ DO

- Use `.env.local` for local development
- Commit `.env.example` with dummy values
- Use different credentials per environment
- Rotate secrets regularly
- Use strong random secrets (see generation below)

### ❌ DON'T

- Commit `.env.local` or `.env` with real values
- Share credentials in code or chat
- Use production credentials locally
- Put secrets in `NEXT_PUBLIC_*` variables
- Use the same secret across environments

## Secret Generation

### Generate Secure Secrets

```bash
# Generate a random secret (32 bytes, base64)
openssl rand -base64 32

# Generate a random UUID
uuidgen

# Generate a hex string (64 characters)
openssl rand -hex 32
```

Use these for JWT secrets, session keys, etc.

## Troubleshooting

### Environment Variables Not Loading

1. **Restart the dev server** - Required after any .env changes
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Check file name** - Must be exactly `.env.local` (with the dot)

3. **Check location** - Must be in the project root (next to package.json)

4. **Check syntax** - No spaces around `=`, no quotes needed (usually)
   ```env
   # ✅ Correct
   DATABASE_URL=postgresql://...
   
   # ❌ Wrong
   DATABASE_URL = postgresql://...
   ```

### CORS Errors

1. **Check allowed origins** - Must include the exact origin
   ```env
   ALLOWED_ORIGINS="http://nssportsclub.ngrok.app,https://nssportsclub.ngrok.app"
   ```

2. **Check ngrok URL** - ngrok URLs change unless you have a static domain

3. **Check browser console** - Shows detailed CORS error messages

4. **Test with curl**
   ```bash
   curl -H "Origin: http://nssportsclub.ngrok.app" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        http://localhost:3000/api/sports -v
   ```

### Database Connection Issues

1. **Check DATABASE_URL format**
   ```env
   # Pooler for runtime
   DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true"
   
   # Direct for migrations
   DIRECT_URL="postgresql://user:pass@host:5432/db"
   ```

2. **Verify Supabase credentials**
   - Go to Supabase Dashboard → Settings → Database
   - Copy the connection strings
   - Update .env.local

3. **Test connection**
   ```bash
   npx prisma db pull
   ```

## Environment-Specific Configuration

### Local Development

```env
# .env.local
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=your_dev_database_url
ALLOWED_ORIGINS=http://localhost:3000,http://nssportsclub.ngrok.app
```

### Production

```env
# .env.production (set in deployment platform)
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=your_production_database_url
ALLOWED_ORIGINS=https://your-domain.com
```

## Deployment

### Vercel

1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.example`
3. Fill in production values
4. Separate by environment (Production, Preview, Development)

### Docker

```dockerfile
# Don't copy .env files to Docker images
# Pass variables at runtime

docker run -e DATABASE_URL="$DATABASE_URL" \
           -e ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
           your-image
```

### Other Platforms

Most platforms support environment variables through:
- Web UI (Heroku, Railway, Render)
- CLI (`railway variables set DATABASE_URL=...`)
- Config files (`fly.toml`, `render.yaml`)

## Validation

### Runtime Validation

The application validates required environment variables at startup:

```typescript
// Happens automatically in Next.js config
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}
```

### Build-time Validation

```bash
# Check environment variables during build
npm run build
```

Missing required variables will cause build failures.

## Additional Resources

- [Next.js Environment Variables Docs](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#environment-variables-best-practices)
- [CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## Summary

✅ **Automatic Loading** - Next.js loads .env files automatically  
✅ **No Extra Packages** - No dotenv package needed  
✅ **Type-Safe** - Environment variables in next.config.ts  
✅ **Secure** - CORS middleware protects API routes  
✅ **Flexible** - Different configs per environment  

**You're all set! Just create `.env.local` and start building.** 🚀
