-- CreateTable
CREATE TABLE "InstitutionReport" (
    "id" TEXT NOT NULL,
    "gradeLevel" TEXT,
    "courseId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "classroomCount" INTEGER NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "avgAttendanceRate" DOUBLE PRECISION NOT NULL,
    "avgGrade" DOUBLE PRECISION NOT NULL,
    "riskCounts" JSONB NOT NULL,
    "fileId" TEXT,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstitutionReport_gradeLevel_idx" ON "InstitutionReport"("gradeLevel");

-- CreateIndex
CREATE INDEX "InstitutionReport_courseId_idx" ON "InstitutionReport"("courseId");
