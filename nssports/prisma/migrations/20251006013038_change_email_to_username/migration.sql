/*
  Warnings:

  - You are about to alter the column `stake` on the `bets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `DoublePrecision`.
  - You are about to alter the column `potentialPayout` on the `bets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `DoublePrecision`.
  - Made the column `userId` on table `bets` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "bets" ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "stake" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "potentialPayout" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "jerseyNumber" TEXT,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_props" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "statType" TEXT NOT NULL,
    "line" DOUBLE PRECISION NOT NULL,
    "overOdds" INTEGER NOT NULL,
    "underOdds" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_props_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_props" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "propType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "selection" TEXT,
    "odds" INTEGER NOT NULL,
    "line" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_props_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "players_teamId_idx" ON "players"("teamId");

-- CreateIndex
CREATE INDEX "player_props_gameId_idx" ON "player_props"("gameId");

-- CreateIndex
CREATE INDEX "player_props_playerId_idx" ON "player_props"("playerId");

-- CreateIndex
CREATE INDEX "player_props_gameId_playerId_idx" ON "player_props"("gameId", "playerId");

-- CreateIndex
CREATE INDEX "game_props_gameId_idx" ON "game_props"("gameId");

-- CreateIndex
CREATE INDEX "game_props_propType_idx" ON "game_props"("propType");

-- CreateIndex
CREATE INDEX "games_leagueId_status_startTime_idx" ON "games"("leagueId", "status", "startTime");

-- CreateIndex
CREATE INDEX "games_homeTeamId_idx" ON "games"("homeTeamId");

-- CreateIndex
CREATE INDEX "games_awayTeamId_idx" ON "games"("awayTeamId");

-- CreateIndex
CREATE INDEX "odds_gameId_betType_idx" ON "odds"("gameId", "betType");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_props" ADD CONSTRAINT "player_props_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_props" ADD CONSTRAINT "player_props_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_props" ADD CONSTRAINT "game_props_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
