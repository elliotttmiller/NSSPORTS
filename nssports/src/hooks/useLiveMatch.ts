/**
 * Custom hook for accessing live match data
 * 
 * This hook provides a simple interface for components to:
 * 1. Get fresh match data from the centralized store
 * 2. Subscribe to specific match updates
 * 3. Ensure Protocol III: Granular State Consumption
 * 
 * Re-exports stable hooks to maintain backward compatibility
 */

export { 
  useMatchById as useLiveMatch,
  useLiveMatches,
  useAllMatches,
  useIsLoading as useIsMatchesLoading,
  useError as useMatchesError
} from './useStableLiveData';
