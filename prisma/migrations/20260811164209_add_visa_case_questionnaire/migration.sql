-- CreateEnum
CREATE TYPE "VisaTravelPurpose" AS ENUM ('TOURISM', 'BUSINESS', 'FAMILY_VISIT', 'STUDY', 'WORK', 'MEDICAL', 'TRANSIT', 'OTHER');

-- CreateEnum
CREATE TYPE "VisaEmploymentStatus" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'STUDENT', 'RETIRED', 'UNEMPLOYED', 'OTHER');

-- CreateEnum
CREATE TYPE "VisaAccommodationType" AS ENUM ('HOTEL', 'HOSTED_BY_FAMILY_OR_FRIEND', 'OWN_PROPERTY', 'OTHER');

-- CreateEnum
CREATE TYPE "VisaPayerType" AS ENUM ('SELF', 'SPONSOR', 'EMPLOYER');

-- AlterTable
ALTER TABLE "visa_request_documents" ADD COLUMN     "requirementKey" TEXT,
ADD COLUMN     "requirementLabel" TEXT;

-- AlterTable
ALTER TABLE "visa_requests" ADD COLUMN     "accommodationType" "VisaAccommodationType",
ADD COLUMN     "countryOfResidence" TEXT,
ADD COLUMN     "employmentStatus" "VisaEmploymentStatus",
ADD COLUMN     "hasPreviousTravel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hostName" TEXT,
ADD COLUMN     "hostRelationship" TEXT,
ADD COLUMN     "payerName" TEXT,
ADD COLUMN     "payerRelationship" TEXT,
ADD COLUMN     "payerType" "VisaPayerType",
ADD COLUMN     "previousTravelNotes" TEXT,
ADD COLUMN     "purposeOfTravel" "VisaTravelPurpose";
