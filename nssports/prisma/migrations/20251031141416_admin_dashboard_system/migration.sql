-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLogin" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "password" TEXT NOT NULL,
    "maxSingleAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "dailyAdjustmentLimit" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "currentDailyTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastDailyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canSuspendPlayers" BOOLEAN NOT NULL DEFAULT true,
    "commissionRate" DOUBLE PRECISION,
    "ipRestriction" TEXT,
    "regionAssignment" TEXT,
    "notes" TEXT,
    "permissions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLogin" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_players" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "password" TEXT NOT NULL,
    "agentId" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bettingLimits" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalBets" INTEGER NOT NULL DEFAULT 0,
    "totalWagered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWinnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastBetAt" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_bets" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "betType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "potentialWin" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "player_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_transactions" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_balance_logs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerUsername" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_balance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_activity_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "targetType" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "admin_users_username_idx" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "admin_users_status_idx" ON "admin_users"("status");

-- CreateIndex
CREATE INDEX "admin_users_role_idx" ON "admin_users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "agents_username_key" ON "agents"("username");

-- CreateIndex
CREATE INDEX "agents_username_idx" ON "agents"("username");

-- CreateIndex
CREATE INDEX "agents_status_idx" ON "agents"("status");

-- CreateIndex
CREATE INDEX "agents_createdBy_idx" ON "agents"("createdBy");

-- CreateIndex
CREATE INDEX "agents_lastDailyReset_idx" ON "agents"("lastDailyReset");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_players_username_key" ON "dashboard_players"("username");

-- CreateIndex
CREATE INDEX "dashboard_players_username_idx" ON "dashboard_players"("username");

-- CreateIndex
CREATE INDEX "dashboard_players_agentId_idx" ON "dashboard_players"("agentId");

-- CreateIndex
CREATE INDEX "dashboard_players_status_idx" ON "dashboard_players"("status");

-- CreateIndex
CREATE INDEX "dashboard_players_balance_idx" ON "dashboard_players"("balance");

-- CreateIndex
CREATE INDEX "dashboard_players_lastBetAt_idx" ON "dashboard_players"("lastBetAt");

-- CreateIndex
CREATE INDEX "player_bets_playerId_idx" ON "player_bets"("playerId");

-- CreateIndex
CREATE INDEX "player_bets_status_idx" ON "player_bets"("status");

-- CreateIndex
CREATE INDEX "player_bets_placedAt_idx" ON "player_bets"("placedAt");

-- CreateIndex
CREATE INDEX "player_transactions_playerId_idx" ON "player_transactions"("playerId");

-- CreateIndex
CREATE INDEX "player_transactions_type_idx" ON "player_transactions"("type");

-- CreateIndex
CREATE INDEX "player_transactions_createdAt_idx" ON "player_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "agent_balance_logs_agentId_idx" ON "agent_balance_logs"("agentId");

-- CreateIndex
CREATE INDEX "agent_balance_logs_playerId_idx" ON "agent_balance_logs"("playerId");

-- CreateIndex
CREATE INDEX "agent_balance_logs_createdAt_idx" ON "agent_balance_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_activity_logs_adminUserId_idx" ON "admin_activity_logs"("adminUserId");

-- CreateIndex
CREATE INDEX "admin_activity_logs_action_idx" ON "admin_activity_logs"("action");

-- CreateIndex
CREATE INDEX "admin_activity_logs_createdAt_idx" ON "admin_activity_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_players" ADD CONSTRAINT "dashboard_players_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_bets" ADD CONSTRAINT "player_bets_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "dashboard_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_transactions" ADD CONSTRAINT "player_transactions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "dashboard_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_balance_logs" ADD CONSTRAINT "agent_balance_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
