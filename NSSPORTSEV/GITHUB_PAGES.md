# GitHub Pages Deployment for NSSPORTSEV

This document explains how to deploy the NSSPORTSEV application to GitHub Pages.

## Overview

NSSPORTSEV is configured to deploy automatically to GitHub Pages when changes are pushed to the `main` branch. The deployment uses Next.js static export to generate a static website.

## Automatic Deployment

### Workflow

The GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) automatically:

1. Builds the NSSPORTSEV application with static export
2. Uploads the generated files to GitHub Pages
3. Deploys to the GitHub Pages URL

### Trigger

The workflow triggers on:
- Push to `main` branch with changes to `NSSPORTSEV/**`
- Manual workflow dispatch from GitHub Actions UI

## Configuration

### Next.js Configuration

The `next.config.ts` file is configured for GitHub Pages deployment:

```typescript
{
  output: process.env.GITHUB_PAGES === 'true' ? 'export' : undefined,
  basePath: process.env.GITHUB_PAGES === 'true' ? '/NSSPORTS' : '',
}
```

### GitHub Repository Settings

To enable GitHub Pages:

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Pages**
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
4. Save the changes

The application will be available at:
```
https://<username>.github.io/NSSPORTS/
```

Or with a custom domain if configured.

## Environment Variables

### Required Variables

For GitHub Pages static export, the API key must be exposed to the client:

- `NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY`: API key for SportsGameOdds API (exposed in client bundle)
- `NEXT_PUBLIC_STREAMING_ENABLED`: Enable/disable WebSocket streaming (default: `false`)

**⚠️ Security Note**: For GitHub Pages deployment, the API key will be exposed in the client-side JavaScript bundle. Consider using:
- A rate-limited API key for public deployments
- A separate key for production vs development
- API key rotation if exposed publicly

### Optional Variables for Live Odds

For live odds integration with real-time streaming:

- `NEXT_PUBLIC_STREAMING_ENABLED`: Enable/disable WebSocket streaming (default: `false`)
- `SPORTSGAMEODDS_API_KEY`: API key for SportsGameOdds API (for server-side builds)

**Important Note for GitHub Pages**: Since GitHub Pages only serves static files, the streaming service will automatically fall back to REST API polling instead of WebSocket streaming. This is handled gracefully in the code.

To add secrets:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Add the secret name and value:
   - `NEXT_PUBLIC_STREAMING_ENABLED`: Set to `true` to enable client-side streaming detection
   - `SPORTSGAMEODDS_API_KEY`: Your API key (optional for static builds)

## Manual Deployment

To manually trigger a deployment:

1. Go to **Actions** tab in your GitHub repository
2. Select "Deploy NSSPORTSEV to GitHub Pages" workflow
3. Click **Run workflow** > **Run workflow**

## Local Testing

To test the static export locally:

```bash
cd NSSPORTSEV

# Build with static export
GITHUB_PAGES=true npm run build

# Serve the static files (requires a static file server)
npx serve out
```

The application will be available at `http://localhost:3000/NSSPORTS/` (note the basePath).

## Mobile Responsiveness

The application is fully mobile responsive with:
- Responsive grid layouts using Tailwind's sm:, md:, and lg: breakpoints
- Mobile-friendly hamburger navigation menu
- Touch-optimized controls and spacing
- Safe area insets for notched devices
- Fluid typography and spacing that adapts to screen size

Tested on breakpoints:
- Mobile: 320px - 640px (portrait and landscape)
- Tablet: 640px - 1024px
- Desktop: 1024px+

## Troubleshooting

### Build Fails

1. Check the Actions logs for specific errors
2. Ensure all dependencies are in `package.json`
3. Verify Next.js configuration supports static export
4. Check for dynamic routes that need to be pre-rendered

### Pages Don't Load

1. Verify the `basePath` in `next.config.ts` matches your repository structure
2. Check browser console for 404 errors
3. Ensure images and assets use relative paths
4. Make sure `.nojekyll` file exists in the `public/` directory

### Streaming Not Working

GitHub Pages only serves static files, so:
- WebSocket streaming is not available on GitHub Pages
- The app automatically falls back to REST API polling
- For full WebSocket streaming support, deploy to a platform that supports Node.js (Vercel, Railway, etc.)
- The streaming detection is handled gracefully in the code

### Mobile Display Issues

If pages don't display correctly on mobile:
1. Check viewport meta tags in `layout.tsx`
2. Verify responsive breakpoints are properly configured
3. Test on actual devices or Chrome DevTools mobile emulation
4. Check for fixed widths that should be responsive

## Custom Domain

To use a custom domain:

1. Add a `CNAME` file to the `NSSPORTSEV/public` directory:
   ```
   your-domain.com
   ```

2. Configure DNS records with your domain provider:
   ```
   Type  Name  Value
   A     @     185.199.108.153
   A     @     185.199.109.153
   A     @     185.199.110.153
   A     @     185.199.111.153
   ```

3. Update repository settings:
   - Go to **Settings** > **Pages**
   - Enter your custom domain
   - Enable "Enforce HTTPS"

## Deployment Status

Check deployment status:
- **Actions Tab**: View workflow runs and logs
- **Deployments**: See deployment history in the right sidebar
- **Pages Settings**: View the live URL

## Support

For issues with deployment:
1. Check GitHub Actions logs
2. Review Next.js static export documentation
3. Create an issue in the repository

## References

- [Next.js Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions](https://docs.github.com/en/actions)
