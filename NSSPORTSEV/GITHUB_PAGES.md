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
  basePath: process.env.GITHUB_PAGES === 'true' ? '/NSSPORTS/NSSPORTSEV' : '',
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

No environment variables are strictly required for the calculators to work, as they operate client-side.

### Optional Variables

For live odds integration (future enhancement):

- `NEXT_PUBLIC_API_BASE_URL`: Base URL for API endpoints (defaults to `/api`)
- `NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY`: API key for live odds (stored as GitHub secret)

To add secrets:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Add the secret name and value
4. Reference in the workflow file

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

### API Routes Don't Work

GitHub Pages only serves static files. API routes (`/api/*`) won't work in static export mode.

For live odds integration:
- Use client-side API calls to external services
- Consider using a separate backend service (Vercel, Railway, etc.)
- Update `NEXT_PUBLIC_API_BASE_URL` to point to your backend

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
