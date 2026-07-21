-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportChannel" AS ENUM ('TICKET', 'LIVE_CHAT');

-- CreateEnum
CREATE TYPE "SupportSenderKind" AS ENUM ('CUSTOMER', 'OPERATOR', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_tenantId_importRunId_fkey";

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requesterMembershipId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "channel" "SupportChannel" NOT NULL DEFAULT 'TICKET',
    "assignedToUserId" TEXT,
    "requesterLastReadAt" TIMESTAMP(3),
    "operatorLastReadAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderMembershipId" TEXT,
    "senderUserId" TEXT,
    "senderKind" "SupportSenderKind" NOT NULL,
    "body" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_requesterMembershipId_updatedAt_idx" ON "SupportTicket"("tenantId", "requesterMembershipId", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_status_priority_lastMessageAt_idx" ON "SupportTicket"("tenantId", "status", "priority", "lastMessageAt");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedToUserId_status_lastMessageAt_idx" ON "SupportTicket"("assignedToUserId", "status", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_tenantId_id_key" ON "SupportTicket"("tenantId", "id");

-- CreateIndex
CREATE INDEX "SupportMessage_tenantId_ticketId_createdAt_idx" ON "SupportMessage"("tenantId", "ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_tenantId_senderMembershipId_idx" ON "SupportMessage"("tenantId", "senderMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportMessage_tenantId_ticketId_clientMessageId_key" ON "SupportMessage"("tenantId", "ticketId", "clientMessageId");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_requesterMembershipId_fkey" FOREIGN KEY ("requesterMembershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_tenantId_ticketId_fkey" FOREIGN KEY ("tenantId", "ticketId") REFERENCES "SupportTicket"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderMembershipId_fkey" FOREIGN KEY ("senderMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
