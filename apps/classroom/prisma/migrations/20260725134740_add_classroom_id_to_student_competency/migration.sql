/*
  Warnings:

  - Added the required column `classroomId` to the `StudentCompetency` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_classroomId_fkey";

-- AlterTable
ALTER TABLE "StudentCompetency" ADD COLUMN     "classroomId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "StudentCompetency_studentId_classroomId_idx" ON "StudentCompetency"("studentId", "classroomId");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
