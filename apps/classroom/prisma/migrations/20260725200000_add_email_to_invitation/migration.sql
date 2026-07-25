-- AlterTable: Agrega campo email a Invitation (necesario para envío de invitaciones)
ALTER TABLE "Invitation" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
