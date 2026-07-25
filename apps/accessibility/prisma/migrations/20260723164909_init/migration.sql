-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AdaptationLevel" AS ENUM ('LEVE', 'MODERADO', 'SIGNIFICATIVO');

-- CreateTable
CREATE TABLE "AccessibilityJob" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "originalText" TEXT,
    "adaptedText" TEXT,
    "summaryText" TEXT,
    "audioFileId" TEXT,
    "subtitlesFileId" TEXT,
    "pictogramData" JSONB,
    "adaptationLevel" "AdaptationLevel" NOT NULL DEFAULT 'MODERADO',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessibilityJob_pkey" PRIMARY KEY ("id")
);
