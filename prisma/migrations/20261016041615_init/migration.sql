-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "gamertag" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetaWeapon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "trend" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "lastVerifiedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "imageKey" TEXT,
    "imageMime" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MetaLoadout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weaponId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attachments" TEXT NOT NULL,
    "equipment" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MetaLoadout_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "MetaWeapon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "format" TEXT,
    "participantType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "teamSize" INTEGER,
    "startsAt" DATETIME NOT NULL,
    "registrationDeadline" DATETIME,
    "prizeAmountMinor" INTEGER,
    "prizeCurrency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "region" TEXT,
    "externalUrl" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "lastVerifiedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "previewKey" TEXT,
    "previewMime" TEXT,
    "version" TEXT,
    "access" TEXT NOT NULL DEFAULT 'MEMBERS',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "weekEnd" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "screenshotKey" TEXT NOT NULL,
    "screenshotMime" TEXT NOT NULL,
    "matchesPlayed" INTEGER,
    "wins" INTEGER,
    "kills" INTEGER,
    "deaths" INTEGER,
    "kdRatio" REAL,
    "notes" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "submittedById" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewNote" TEXT,
    CONSTRAINT "WeeklyStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyStat_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WeeklyStat_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaWeapon_slug_key" ON "MetaWeapon"("slug");

-- CreateIndex
CREATE INDEX "MetaWeapon_published_game_mode_idx" ON "MetaWeapon"("published", "game", "mode");

-- CreateIndex
CREATE INDEX "MetaLoadout_weaponId_idx" ON "MetaLoadout"("weaponId");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_externalId_key" ON "Tournament"("externalId");

-- CreateIndex
CREATE INDEX "Tournament_published_archived_startsAt_idx" ON "Tournament"("published", "archived", "startsAt");

-- CreateIndex
CREATE INDEX "Resource_published_category_idx" ON "Resource"("published", "category");

-- CreateIndex
CREATE INDEX "WeeklyStat_playerId_weekStart_idx" ON "WeeklyStat"("playerId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyStat_playerId_weekStart_game_mode_key" ON "WeeklyStat"("playerId", "weekStart", "game", "mode");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
