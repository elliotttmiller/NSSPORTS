-- AlterTable
ALTER TABLE "bets" ADD COLUMN     "teaserMetadata" JSONB,
ADD COLUMN     "teaserType" TEXT;

-- CreateIndex
CREATE INDEX "bets_betType_idx" ON "bets"("betType");
