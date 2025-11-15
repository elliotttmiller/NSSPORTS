-- AlterTable
ALTER TABLE "games" ADD COLUMN     "finishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "bets_status_gameId_idx" ON "bets"("status", "gameId");

-- CreateIndex
CREATE INDEX "bets_status_settledAt_idx" ON "bets"("status", "settledAt");

-- CreateIndex
CREATE INDEX "games_status_updatedAt_idx" ON "games"("status", "updatedAt");
