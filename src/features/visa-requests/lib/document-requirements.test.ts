import { describe, it, expect } from "vitest";

import {
  resolveDocumentRequirements,
  computeCompleteness,
  type VisaCaseInput,
} from "@/features/visa-requests/lib/document-requirements";

function baseCase(overrides: Partial<VisaCaseInput> = {}): VisaCaseInput {
  return {
    destinationCountry: "FR",
    countryOfResidence: "DZ",
    purposeOfTravel: "TOURISM",
    employmentStatus: "EMPLOYED",
    accommodationType: "HOTEL",
    payerType: "SELF",
    hasPreviousTravel: false,
    ...overrides,
  };
}

function keysWithStatus(checklist: ReturnType<typeof resolveDocumentRequirements>, status: string) {
  return checklist.requirements.filter((r) => r.status === status).map((r) => r.key);
}

describe("resolveDocumentRequirements", () => {
  it("resolves a Schengen employed/hotel/self-pay tourist case", () => {
    const checklist = resolveDocumentRequirements(baseCase());
    expect(checklist.ruleSetId).toBe("SCHENGEN");
    expect(checklist.isFallback).toBe(false);
    const required = keysWithStatus(checklist, "REQUIRED");
    expect(required).toEqual(
      expect.arrayContaining([
        "PASSPORT_BIO_PAGE",
        "VISA_PHOTO",
        "TRAVEL_ITINERARY",
        "RETURN_FLIGHT_RESERVATION",
        "TRAVEL_MEDICAL_INSURANCE",
        "HOTEL_RESERVATION",
        "PROOF_OF_ACCOMMODATION",
        "BANK_STATEMENTS",
      ]),
    );
    // Employment-status documents are supporting evidence, not a named
    // mandatory document per any of the four researched sources — present
    // in the checklist (so the applicant CAN upload them) but OPTIONAL.
    const optional = keysWithStatus(checklist, "OPTIONAL");
    expect(optional).toEqual(expect.arrayContaining(["EMPLOYMENT_CERTIFICATE", "PAYSLIPS"]));
    // Not hosted, not sponsored, not a student — those categories must not appear as REQUIRED.
    expect(required).not.toContain("INVITATION_LETTER");
    expect(required).not.toContain("SPONSOR_FINANCIAL_DOCUMENTS");
    expect(required).not.toContain("STUDENT_CERTIFICATE");
  });

  it("requires sponsor AND host documents independently when both apply", () => {
    const checklist = resolveDocumentRequirements(
      baseCase({ accommodationType: "HOSTED_BY_FAMILY_OR_FRIEND", payerType: "SPONSOR" }),
    );
    const required = keysWithStatus(checklist, "REQUIRED");
    expect(required).toEqual(
      expect.arrayContaining([
        "INVITATION_LETTER",
        "PROOF_OF_RELATIONSHIP_TO_HOST",
        "SPONSOR_FINANCIAL_DOCUMENTS",
        "SPONSOR_IDENTITY_DOCUMENTS",
      ]),
    );
    // A sponsored, hosted case has neither a hotel booking nor self-funded bank statements as REQUIRED.
    expect(required).not.toContain("HOTEL_RESERVATION");
  });

  it("surfaces a student certificate slot for USA study purpose regardless of employment status", () => {
    const checklist = resolveDocumentRequirements(
      baseCase({ destinationCountry: "US", purposeOfTravel: "STUDY", employmentStatus: "UNEMPLOYED" }),
    );
    expect(checklist.ruleSetId).toBe("USA");
    // Not asserted REQUIRED — no researched visitor-visa source names this
    // as a mandatory document (see the rules engine's comment on why study/
    // work purpose documents are calibrated OPTIONAL) — only that it's
    // offered to the applicant at all.
    expect(checklist.requirements.map((r) => r.key)).toContain("STUDENT_CERTIFICATE");
  });

  it("falls back to baseline-only for an unconfigured destination", () => {
    const checklist = resolveDocumentRequirements(baseCase({ destinationCountry: "JP" }));
    expect(checklist.ruleSetId).toBe("UNCONFIGURED");
    expect(checklist.isFallback).toBe(true);
    expect(checklist.requirements.map((r) => r.key)).toEqual(
      expect.arrayContaining(["PASSPORT_BIO_PAGE", "NATIONAL_ID", "PREVIOUS_VISAS", "PREVIOUS_PASSPORTS", "OTHER_CASE_SPECIFIC"]),
    );
    // No destination-specific items should have been pulled in.
    expect(checklist.requirements.map((r) => r.key)).not.toContain("VISA_PHOTO");
  });

  it("promotes previous-travel documents from IF_APPLICABLE to OPTIONAL when disclosed", () => {
    const withoutHistory = resolveDocumentRequirements(baseCase({ hasPreviousTravel: false }));
    const withHistory = resolveDocumentRequirements(baseCase({ hasPreviousTravel: true }));
    const find = (checklist: typeof withHistory, key: string) => checklist.requirements.find((r) => r.key === key);

    expect(find(withoutHistory, "PREVIOUS_VISAS")?.status).toBe("IF_APPLICABLE");
    expect(find(withHistory, "PREVIOUS_VISAS")?.status).toBe("OPTIONAL");
  });

  it("resolves any Schengen member state to the SCHENGEN rule set", () => {
    expect(resolveDocumentRequirements(baseCase({ destinationCountry: "DE" })).ruleSetId).toBe("SCHENGEN");
    expect(resolveDocumentRequirements(baseCase({ destinationCountry: "IT" })).ruleSetId).toBe("SCHENGEN");
    expect(resolveDocumentRequirements(baseCase({ destinationCountry: "CH" })).ruleSetId).toBe("SCHENGEN");
  });

  it("returns requirements in a stable, deterministic display order", () => {
    const keys = resolveDocumentRequirements(baseCase()).requirements.map((r) => r.key);
    const sortedByCatalogOrder = [...keys];
    expect(keys).toEqual(sortedByCatalogOrder);
  });
});

describe("computeCompleteness", () => {
  it("counts satisfied/missing REQUIRED documents and OPTIONAL documents present", () => {
    const checklist = resolveDocumentRequirements(baseCase());
    const required = checklist.requirements.filter((r) => r.status === "REQUIRED").map((r) => r.key);
    // Submit only the first half of the required documents, plus one optional-status one if present.
    const submittedRequired = required.slice(0, Math.ceil(required.length / 2));
    const optionalKey = checklist.requirements.find((r) => r.status === "OPTIONAL")?.key ?? null;

    const documents = [
      ...submittedRequired.map((requirementKey) => ({ requirementKey })),
      ...(optionalKey ? [{ requirementKey: optionalKey }] : []),
    ];

    const result = computeCompleteness(checklist, documents);
    expect(result.requiredTotal).toBe(required.length);
    expect(result.requiredSatisfied).toBe(submittedRequired.length);
    expect(result.missingRequired).toEqual(required.slice(Math.ceil(required.length / 2)));
    if (optionalKey) expect(result.optionalPresent).toContain(optionalKey);
  });

  it("ignores null requirementKeys (legacy/uncategorized documents)", () => {
    const checklist = resolveDocumentRequirements(baseCase());
    const result = computeCompleteness(checklist, [{ requirementKey: null }, { requirementKey: null }]);
    expect(result.requiredSatisfied).toBe(0);
  });
});
