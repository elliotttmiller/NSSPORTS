/**
 * Client-side authentication utilities
 * Separated from authHelpers.ts to avoid bundling Prisma in client code
 */

/**
 * Client-side: Handle API authentication errors.
 * Redirects to login on 401, returns true if error was handled.
 * @returns true if error was handled (401/403), false otherwise
 */
export function handleAuthError(response: Response): boolean {
  if (response.status === 401) {
    // Session expired - redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return true;
  }
  
  if (response.status === 403) {
    // Permission denied
    return true;
  }
  
  return false;
}
