-- Clear all cached odds to force fresh fetch with includeConsensus
TRUNCATE TABLE odds CASCADE;
TRUNCATE TABLE games CASCADE;
