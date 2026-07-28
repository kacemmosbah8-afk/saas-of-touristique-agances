-- AlterEnum
BEGIN;
CREATE TYPE "MembershipRole_new" AS ENUM ('OWNER', 'ADMIN', 'AGENT', 'READ_ONLY');
ALTER TABLE "memberships" ALTER COLUMN "role" TYPE "MembershipRole_new" USING ("role"::text::"MembershipRole_new");
ALTER TABLE "invitations" ALTER COLUMN "role" TYPE "MembershipRole_new" USING ("role"::text::"MembershipRole_new");
ALTER TYPE "MembershipRole" RENAME TO "MembershipRole_old";
ALTER TYPE "MembershipRole_new" RENAME TO "MembershipRole";
DROP TYPE "public"."MembershipRole_old";
COMMIT;

