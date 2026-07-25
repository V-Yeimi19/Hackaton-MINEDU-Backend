-- AlterTable: Classroom.courseId ON DELETE CASCADE
ALTER TABLE "Classroom" DROP CONSTRAINT "Classroom_courseId_fkey";
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Attendance.classroomId ON DELETE CASCADE
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_classroomId_fkey";
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Grade.classroomId ON DELETE CASCADE
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_classroomId_fkey";
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: unique attendance per student/classroom/date
CREATE UNIQUE INDEX "Attendance_studentId_classroomId_date_key" ON "Attendance"("studentId", "classroomId", "date");
