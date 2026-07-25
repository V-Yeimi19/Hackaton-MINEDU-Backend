-- CreateEnum
CREATE TYPE "SupportNeedType" AS ENUM ('DISCAPACIDAD_VISUAL', 'DISCAPACIDAD_AUDITIVA', 'DISCAPACIDAD_INTELECTUAL', 'DISCAPACIDAD_MOTORA', 'TRASTORNO_ESPECTRO_AUTISTA', 'DIFICULTAD_APRENDIZAJE', 'TDAH', 'MULTIDISCAPACIDAD', 'OTRO');

-- CreateEnum
CREATE TYPE "SupportLevel" AS ENUM ('LEVE', 'MODERADO', 'SIGNIFICATIVO');

-- CreateTable
CREATE TABLE "StudentSupportNeed" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "SupportNeedType" NOT NULL,
    "level" "SupportLevel" NOT NULL DEFAULT 'MODERADO',
    "description" TEXT,
    "registeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSupportNeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentSupportNeed_studentId_idx" ON "StudentSupportNeed"("studentId");
