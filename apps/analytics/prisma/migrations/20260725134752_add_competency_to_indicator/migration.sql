-- AlterTable
ALTER TABLE "StudentIndicator" ADD COLUMN     "competencyCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "competencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
