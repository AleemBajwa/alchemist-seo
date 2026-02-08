-- CreateTable
CREATE TABLE "WhiteLabel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhiteLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionHistory" (
    "id" TEXT NOT NULL,
    "trackedKeywordId" TEXT NOT NULL,
    "position" INTEGER,
    "url" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionHistory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AuditRun" ADD COLUMN "pagesCount" INTEGER DEFAULT 1;
ALTER TABLE "AuditRun" ADD COLUMN "crawlType" TEXT DEFAULT 'single';

-- AlterTable
ALTER TABLE "TrackedKeyword" ADD COLUMN "domain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WhiteLabel_userId_key" ON "WhiteLabel"("userId");

-- AddForeignKey
ALTER TABLE "WhiteLabel" ADD CONSTRAINT "WhiteLabel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionHistory" ADD CONSTRAINT "PositionHistory_trackedKeywordId_fkey" FOREIGN KEY ("trackedKeywordId") REFERENCES "TrackedKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
