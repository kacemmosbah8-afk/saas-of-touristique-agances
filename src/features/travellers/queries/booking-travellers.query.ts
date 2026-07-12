import "server-only";

import type { TravellerType, Gender, VisaStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import {
  checkPassportExpiry,
  type PassportCheck,
} from "@/features/travellers/lib/passport-validation";

export type TravellerView = {
  id: string;
  type: TravellerType;
  isPrimary: boolean;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: Date | null;
  nationality: string | null;
  passportNumber: string | null;
  passportIssuingCountry: string | null;
  passportIssueDate: Date | null;
  passportExpiry: Date | null;
  passportCheck: PassportCheck;
  visaStatus: VisaStatus;
  visaNotes: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  specialRequests: string | null;
  medicalNotes: string | null;
  frequentFlyerAirline: string | null;
  frequentFlyerNumber: string | null;
};

/** The booking's traveller list, primary first, each with its passport
 * check evaluated against the booking's travel end date. */
export async function listBookingTravellers(
  db: TenantDb,
  tenantId: string,
  bookingId: string,
): Promise<TravellerView[]> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId },
    select: {
      travelEndDate: true,
      travellers: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
    },
  });
  if (!booking) return [];

  return booking.travellers.map((t) => ({
    id: t.id,
    type: t.type,
    isPrimary: t.isPrimary,
    firstName: t.firstName,
    lastName: t.lastName,
    gender: t.gender,
    dateOfBirth: t.dateOfBirth,
    nationality: t.nationality,
    passportNumber: t.passportNumber,
    passportIssuingCountry: t.passportIssuingCountry,
    passportIssueDate: t.passportIssueDate,
    passportExpiry: t.passportExpiry,
    passportCheck: checkPassportExpiry(t.passportExpiry, booking.travelEndDate),
    visaStatus: t.visaStatus,
    visaNotes: t.visaNotes,
    emergencyContactName: t.emergencyContactName,
    emergencyContactPhone: t.emergencyContactPhone,
    emergencyContactRelation: t.emergencyContactRelation,
    specialRequests: t.specialRequests,
    medicalNotes: t.medicalNotes,
    frequentFlyerAirline: t.frequentFlyerAirline,
    frequentFlyerNumber: t.frequentFlyerNumber,
  }));
}
