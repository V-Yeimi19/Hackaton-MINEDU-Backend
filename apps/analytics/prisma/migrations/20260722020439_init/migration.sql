-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'SENT', 'DISMISSED');

-- CreateTable
CREATE TABLE "StudentIndicator" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "presentCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "attendanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgGrade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gradeCount" INTEGER NOT NULL DEFAULT 0,
    "gradeSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "participationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "reasons" TEXT[],
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentIndicator_studentId_classroomId_key" ON "StudentIndicator"("studentId", "classroomId");

-- CreateIndex
CREATE INDEX "RiskAssessment_studentId_classroomId_idx" ON "RiskAssessment"("studentId", "classroomId");

-- CreateIndex
CREATE INDEX "Recommendation_studentId_classroomId_idx" ON "Recommendation"("studentId", "classroomId");
