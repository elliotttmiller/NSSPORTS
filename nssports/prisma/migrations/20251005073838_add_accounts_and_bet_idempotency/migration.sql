/*
  Warnings:

  - You are about to alter the column `stake` on the `bets` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `potentialPayout` on the `bets` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `bets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bets" ADD COLUMN     "idempotencyKey" TEXT,
ALTER COLUMN "stake" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "potentialPayout" SET DATA TYPE DECIMAL(18,2);

-- CreateTable
CREATE TABLE "accounts" (
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "bets_idempotencyKey_key" ON "bets"("idempotencyKey");

-- CreateIndex
CREATE INDEX "bets_userId_status_placedAt_idx" ON "bets"("userId", "status", "placedAt");
