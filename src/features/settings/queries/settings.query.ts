import { prisma } from "@/shared/lib/db";
import {
  profileSettingsSchema,
  type ProfileSettings,
} from "@/features/settings/schemas/settings.schema";

/**
 * Public, unauthenticated read of just the agency's public profile — used
 * by the storefront's layout/header/footer/contact surfaces. Deliberately
 * bypasses `getTenantDb`/`requirePermission`: an anonymous visitor has no
 * session and no membership to check, so this queries the raw `prisma`
 * client directly, scoped by an explicit `tenantId` on every call.
 */
export async function getAgencyProfile(tenantId: string): Promise<ProfileSettings> {
  const row = await prisma.tenantSettings.findFirst({
    where: { tenantId },
    select: { profileSettings: true },
  });

  return profileSettingsSchema.parse(row?.profileSettings ?? {});
}
