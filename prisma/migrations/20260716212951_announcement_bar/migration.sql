-- CreateTable
CREATE TABLE "AnnouncementBar" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "backgroundColor" TEXT NOT NULL DEFAULT '#183f3b',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "animation" TEXT NOT NULL DEFAULT 'static',
    "linkUrl" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementBar_pkey" PRIMARY KEY ("id")
);
