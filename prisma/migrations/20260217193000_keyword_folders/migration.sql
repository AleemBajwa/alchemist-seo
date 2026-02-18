-- CreateTable
CREATE TABLE "KeywordFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordFolder_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Keyword" ADD COLUMN "folderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "KeywordFolder_projectId_name_key" ON "KeywordFolder"("projectId", "name");

-- AddForeignKey
ALTER TABLE "KeywordFolder" ADD CONSTRAINT "KeywordFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "KeywordFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
