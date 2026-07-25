/*
  Reemplaza el enum Role: desaparecen ESPECIALISTA y ESTUDIANTE, aparece FAMILIAR.
  Los perfiles existentes se mapean en vez de borrarse (mismo mapeo que auth_db):
    ESTUDIANTE   -> FAMILIAR
    ESPECIALISTA -> DOCENTE
*/
-- CreateEnum (nuevo)
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DIRECTIVO', 'DOCENTE', 'FAMILIAR');

-- Mapear datos existentes a los roles supervivientes
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT;
UPDATE "User" SET "role" = 'FAMILIAR' WHERE "role" = 'ESTUDIANTE';
UPDATE "User" SET "role" = 'DOCENTE' WHERE "role" = 'ESPECIALISTA';
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::"Role_new");

-- DropEnum (viejo) y renombrar
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
