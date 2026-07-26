-- CreateEnum
CREATE TYPE "SnapshotScope" AS ENUM ('NATIONAL', 'INSTITUTION');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LEVE', 'MODERADO', 'GRAVE');

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "scope" "SnapshotScope" NOT NULL,
    "scopeId" TEXT,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseProgress" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "completedUnits" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentIncident" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'LEVE',
    "registeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricSnapshot_scope_scopeId_metric_capturedAt_idx" ON "MetricSnapshot"("scope", "scopeId", "metric", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProgress_courseId_key" ON "CourseProgress"("courseId");

-- CreateIndex
CREATE INDEX "StudentIncident_studentId_idx" ON "StudentIncident"("studentId");
