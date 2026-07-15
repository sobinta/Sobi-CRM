-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "aiSummaryAt" TIMESTAMP(3),
ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "leadId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "scoreRationale" TEXT,
ADD COLUMN     "scoredAt" TIMESTAMP(3);
