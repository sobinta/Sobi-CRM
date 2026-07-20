ALTER TABLE "Contract" ADD COLUMN "shareTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX "Contract_shareTokenExpiresAt_idx"
  ON "Contract"("shareTokenExpiresAt");
