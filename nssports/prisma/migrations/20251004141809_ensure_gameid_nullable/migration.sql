-- AlterTable
ALTER TABLE "bets" ADD COLUMN     "legs" JSONB,
ALTER COLUMN "gameId" DROP NOT NULL;
