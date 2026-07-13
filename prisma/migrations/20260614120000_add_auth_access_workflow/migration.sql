-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- User password metadata may already exist in environments that used db push.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AccessRequest" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "message" TEXT,
  "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedRole" "Role" NOT NULL DEFAULT 'VIEWER',
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- Keep this migration safe for databases where AccessRequest was already pushed.
ALTER TABLE "AccessRequest" ADD COLUMN IF NOT EXISTS "requestedRole" "Role" NOT NULL DEFAULT 'VIEWER';
ALTER TABLE "AccessRequest" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AccessRequest_email_key" ON "AccessRequest"("email");
CREATE INDEX IF NOT EXISTS "AccessRequest_status_idx" ON "AccessRequest"("status");
CREATE INDEX IF NOT EXISTS "AccessRequest_createdAt_idx" ON "AccessRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "AccessRequest_reviewedById_idx" ON "AccessRequest"("reviewedById");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordResetToken"
      ADD CONSTRAINT "PasswordResetToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AccessRequest_reviewedById_fkey'
  ) THEN
    ALTER TABLE "AccessRequest"
      ADD CONSTRAINT "AccessRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
