/**
 * Resource Hints Utility
 * 
 * Provides functions to add resource hints for better performance
 * - Preconnect: Establish early connections to important origins
 * - DNS Prefetch: Resolve domain names ahead of time
 * - Preload: Load critical resources early
 * 
 * OPTIMIZATION: Reduces latency for critical resources
 */

/**
 * Add DNS prefetch link for a domain
 * Resolves DNS before the resource is actually needed
 */
export function addDnsPrefetch(href: string): void {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = href;
  
  // Check if already exists
  const existing = document.querySelector(`link[rel="dns-prefetch"][href="${href}"]`);
  if (!existing) {
    document.head.appendChild(link);
  }
}

/**
 * Add preconnect link for an origin
 * Establishes connection (DNS + TCP + TLS) before the resource is needed
 */
export function addPreconnect(href: string, crossOrigin?: boolean): void {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  
  if (crossOrigin) {
    link.crossOrigin = 'anonymous';
  }
  
  // Check if already exists
  const existing = document.querySelector(`link[rel="preconnect"][href="${href}"]`);
  if (!existing) {
    document.head.appendChild(link);
  }
}

/**
 * Add preload link for a critical resource
 * Loads the resource early in the page lifecycle
 */
export function addPreload(
  href: string, 
  as: 'script' | 'style' | 'font' | 'fetch' | 'image',
  options?: {
    type?: string;
    crossOrigin?: boolean;
  }
): void {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  
  if (options?.type) {
    link.type = options.type;
  }
  
  if (options?.crossOrigin) {
    link.crossOrigin = 'anonymous';
  }
  
  // Check if already exists
  const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
  if (!existing) {
    document.head.appendChild(link);
  }
}

/**
 * Setup common resource hints for the application
 * Call this early in the app lifecycle for best results
 */
export function setupResourceHints(): void {
  if (typeof document === 'undefined') return;
  
  // Preconnect to API if it's on a different origin
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (apiUrl && apiUrl.startsWith('http')) {
    try {
      const url = new URL(apiUrl);
      if (url.origin !== window.location.origin) {
        addPreconnect(url.origin, true);
      }
    } catch {
      // Invalid URL, skip
    }
  }
  
  // DNS prefetch for common external resources
  // Add your CDN domains, API domains, etc. here
  // Example: addDnsPrefetch('https://cdn.example.com');
}
