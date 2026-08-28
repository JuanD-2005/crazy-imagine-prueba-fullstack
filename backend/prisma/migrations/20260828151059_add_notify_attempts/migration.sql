-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "lastNotifyAttemptAt" TIMESTAMP(3),
ADD COLUMN     "notifyAttempts" INTEGER NOT NULL DEFAULT 0;
