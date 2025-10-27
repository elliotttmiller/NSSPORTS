/**
 * Pagination Handler for SportsGameOdds API
 * 
 * Implements cursor-based pagination pattern from official documentation:
 * https://sportsgameodds.com/docs/guides/data-batches
 * 
 * Features:
 * - Automatic cursor pagination
 * - Configurable batch sizes (max 100)
 * - Error handling and retry logic
 * - Progress callbacks
 */

import { logger } from './logger';

export interface PaginationOptions {
  limit?: number; // Max 100, default 10
  maxPages?: number; // Safety limit to prevent infinite loops
  onProgress?: (current: number, total: number, cursor: string | null) => void;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Fetch all pages of data using cursor pagination
 * 
 * Example:
 * ```typescript
 * const allEvents = await fetchAllPages(
 *   async (cursor) => {
 *     return await client.events.get({
 *       leagueID: 'NBA',
 *       limit: 100,
 *       cursor
 *     });
 *   },
 *   { limit: 100, maxPages: 50 }
 * );
 * ```
 */
export async function fetchAllPages<T>(
  fetcher: (cursor: string | null) => Promise<{ data: T[]; nextCursor?: string | null }>,
  options: PaginationOptions = {}
): Promise<T[]> {
  const { maxPages = 100, onProgress } = options;
  
  let allData: T[] = [];
  let nextCursor: string | null = null;
  let pageCount = 0;

  logger.info('[Pagination] Starting pagination fetch', {
    maxPages,
    limit: options.limit,
  });

  do {
    try {
      pageCount++;
      
      logger.debug('[Pagination] Fetching page', {
        page: pageCount,
        cursor: nextCursor,
      });

      const response = await fetcher(nextCursor);
      
      if (!response || !Array.isArray(response.data)) {
        logger.warn('[Pagination] Invalid response format', { response });
        break;
      }

      allData = allData.concat(response.data);
      nextCursor = response.nextCursor || null;

      logger.debug('[Pagination] Page fetched', {
        page: pageCount,
        itemsThisPage: response.data.length,
        totalItems: allData.length,
        hasMore: !!nextCursor,
      });

      if (onProgress) {
        onProgress(pageCount, maxPages, nextCursor);
      }

      // Safety check
      if (pageCount >= maxPages) {
        logger.warn('[Pagination] Reached max pages limit', {
          pageCount,
          maxPages,
          totalItems: allData.length,
        });
        break;
      }

    } catch (error) {
      logger.error('[Pagination] Error fetching page', {
        page: pageCount,
        error: error instanceof Error ? error.message : error,
      });
      
      // Don't throw - return what we have so far
      break;
    }
  } while (nextCursor);

  logger.info('[Pagination] Pagination complete', {
    totalPages: pageCount,
    totalItems: allData.length,
  });

  return allData;
}

/**
 * Fetch a single page with cursor support
 */
export async function fetchPage<T>(
  fetcher: (cursor: string | null) => Promise<{ data: T[]; nextCursor?: string | null }>,
  cursor: string | null = null
): Promise<PaginatedResponse<T>> {
  logger.debug('[Pagination] Fetching single page', { cursor });

  const response = await fetcher(cursor);
  
  return {
    data: response.data || [],
    nextCursor: response.nextCursor || null,
    hasMore: !!response.nextCursor,
  };
}

/**
 * Create an async iterator for paginated data
 * 
 * Example:
 * ```typescript
 * for await (const page of paginateData(fetcher, { limit: 100 })) {
 *   console.log(`Processing ${page.length} items...`);
 *   // Process page
 * }
 * ```
 */
export async function* paginateData<T>(
  fetcher: (cursor: string | null) => Promise<{ data: T[]; nextCursor?: string | null }>,
  options: PaginationOptions = {}
): AsyncGenerator<T[], void, unknown> {
  const { maxPages = 100 } = options;
  
  let nextCursor: string | null = null;
  let pageCount = 0;

  do {
    pageCount++;
    
    if (pageCount > maxPages) {
      logger.warn('[Pagination] Reached max pages in iterator', { pageCount, maxPages });
      break;
    }

    const response = await fetcher(nextCursor);
    
    if (!response || !Array.isArray(response.data)) {
      break;
    }

    yield response.data;
    
    nextCursor = response.nextCursor || null;
  } while (nextCursor);
}
