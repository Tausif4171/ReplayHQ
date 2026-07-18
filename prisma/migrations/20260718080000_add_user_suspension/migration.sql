ALTER TABLE "User"
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedById" TEXT,
ADD COLUMN "suspensionReason" TEXT;

CREATE INDEX "User_suspendedAt_idx" ON "User"("suspendedAt");
CREATE INDEX "User_suspendedById_idx" ON "User"("suspendedById");
