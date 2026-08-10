-- AlterTable
ALTER TABLE "visa_request_documents" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "qualityNotes" TEXT,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "visa_requests" ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);
