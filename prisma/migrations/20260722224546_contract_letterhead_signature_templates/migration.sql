-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "calendarMode" TEXT NOT NULL DEFAULT 'jalali',
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedById" TEXT,
ADD COLUMN     "templateKey" TEXT NOT NULL DEFAULT 'consulting';
