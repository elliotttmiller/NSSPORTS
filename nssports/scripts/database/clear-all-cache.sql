-- Complete Cache Clear Script
-- Clears ALL cached data for a fresh start

-- 1. Clear odds cache (main cache layer)
TRUNCATE TABLE "odds" CASCADE;

-- 2. Clear games cache
TRUNCATE TABLE "games" CASCADE;

-- 3. Optional: Clear player props if you want completely fresh data
-- TRUNCATE TABLE "player_props" CASCADE;

-- Verify cache is empty
SELECT 'Odds cleared' as status, COUNT(*) as remaining FROM "odds"
UNION ALL
SELECT 'Games cleared' as status, COUNT(*) as remaining FROM "games";
