-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "pdfFileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_classroomId_idx" ON "Report"("classroomId");

-- CreateIndex
CREATE INDEX "Report_courseId_idx" ON "Report"("courseId");
