-- AlterTable
ALTER TABLE "admin_activity_logs" ADD COLUMN     "resource" TEXT,
ADD COLUMN     "resourceId" TEXT;

-- CreateTable
CREATE TABLE "odds_configuration" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastModified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedBy" TEXT NOT NULL,
    "spreadMargin" DOUBLE PRECISION NOT NULL DEFAULT 0.045,
    "moneylineMargin" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "totalMargin" DOUBLE PRECISION NOT NULL DEFAULT 0.045,
    "playerPropsMargin" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "gamePropsMargin" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "roundingMethod" TEXT NOT NULL DEFAULT 'nearest10',
    "minOdds" INTEGER NOT NULL DEFAULT -10000,
    "maxOdds" INTEGER NOT NULL DEFAULT 10000,
    "leagueOverrides" JSONB,
    "liveGameMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "odds_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odds_config_history" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "changedFields" JSONB NOT NULL,
    "previousValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "reason" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odds_config_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "odds_configuration_isActive_idx" ON "odds_configuration"("isActive");

-- CreateIndex
CREATE INDEX "odds_configuration_lastModified_idx" ON "odds_configuration"("lastModified");

-- CreateIndex
CREATE INDEX "odds_config_history_configId_idx" ON "odds_config_history"("configId");

-- CreateIndex
CREATE INDEX "odds_config_history_adminUserId_idx" ON "odds_config_history"("adminUserId");

-- CreateIndex
CREATE INDEX "odds_config_history_createdAt_idx" ON "odds_config_history"("createdAt");

-- AddForeignKey
ALTER TABLE "odds_configuration" ADD CONSTRAINT "odds_configuration_modifiedBy_fkey" FOREIGN KEY ("modifiedBy") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odds_config_history" ADD CONSTRAINT "odds_config_history_configId_fkey" FOREIGN KEY ("configId") REFERENCES "odds_configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odds_config_history" ADD CONSTRAINT "odds_config_history_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
