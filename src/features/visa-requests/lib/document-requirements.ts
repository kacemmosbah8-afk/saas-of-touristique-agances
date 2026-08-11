import type {
  DocumentCategory,
  VisaAccommodationType,
  VisaEmploymentStatus,
  VisaPayerType,
  VisaTravelPurpose,
} from "@prisma/client";

/**
 * Dynamic visa document checklist — pure data + pure functions, no
 * `"use client"`/`"use server"` directive and no DOM/Prisma-client-runtime
 * dependency, so this module can be imported identically by the public
 * form (client component), the server action, the admin query, and its own
 * test file.
 *
 * IMPORTANT — this is a *preparation guide*, not a legal/consular
 * database. Rules below are sourced from the official government pages
 * cited per rule set (see each `RULE_SETS` entry's header comment for its
 * sources — European Commission / service-public.gouv.fr / EUR-Lex for
 * Schengen, travel.state.gov for the USA, canada.ca/IRCC for Canada,
 * immi.homeaffairs.gov.au for Australia; all fetched and verified directly
 * on 2026-08-11); anything not explicitly backed by one of those sources is
 * marked OPTIONAL/IF_APPLICABLE rather than asserted as REQUIRED. A
 * consulate, embassy, or visa application centre may always request
 * additional documents beyond what's listed here — this is why every
 * surface using this module also renders `disclaimerVariesByCase` (see the
 * public form and admin detail view), and why the admin remains the final
 * human reviewer (`computeCompleteness` never returns an "application
 * complete" signal — only a required-documents-uploaded count).
 */

export const MAX_VISA_DOCUMENT_BYTES = 4 * 1024 * 1024;

/** Mirrors `status.ts`'s `VISA_REQUEST_STATUSES` pattern — an explicit
 * const array (rather than deriving from the Prisma runtime enum object)
 * so `publicVisaRequestSchema` can build a `z.enum(...)` from it. */
export const VISA_TRAVEL_PURPOSES = [
  "TOURISM",
  "BUSINESS",
  "FAMILY_VISIT",
  "STUDY",
  "WORK",
  "MEDICAL",
  "TRANSIT",
  "OTHER",
] as const satisfies readonly VisaTravelPurpose[];

export const VISA_EMPLOYMENT_STATUSES = [
  "EMPLOYED",
  "SELF_EMPLOYED",
  "STUDENT",
  "RETIRED",
  "UNEMPLOYED",
  "OTHER",
] as const satisfies readonly VisaEmploymentStatus[];

export const VISA_ACCOMMODATION_TYPES = [
  "HOTEL",
  "HOSTED_BY_FAMILY_OR_FRIEND",
  "OWN_PROPERTY",
  "OTHER",
] as const satisfies readonly VisaAccommodationType[];

export const VISA_PAYER_TYPES = ["SELF", "SPONSOR", "EMPLOYER"] as const satisfies readonly VisaPayerType[];

export type RequirementStatus = "REQUIRED" | "OPTIONAL" | "IF_APPLICABLE";

export type DocumentRequirementKey =
  | "PASSPORT_BIO_PAGE"
  | "NATIONAL_ID"
  | "VISA_PHOTO"
  | "PROOF_OF_ACCOMMODATION"
  | "HOTEL_RESERVATION"
  | "INVITATION_LETTER"
  | "PROOF_OF_RELATIONSHIP_TO_HOST"
  | "BANK_STATEMENTS"
  | "PAYSLIPS"
  | "EMPLOYMENT_CERTIFICATE"
  | "LEAVE_AUTHORIZATION"
  | "BUSINESS_REGISTRATION"
  | "STUDENT_CERTIFICATE"
  | "PROPERTY_ASSET_EVIDENCE"
  | "TRAVEL_ITINERARY"
  | "RETURN_FLIGHT_RESERVATION"
  | "TRAVEL_MEDICAL_INSURANCE"
  | "PREVIOUS_VISAS"
  | "PREVIOUS_PASSPORTS"
  | "SPONSOR_FINANCIAL_DOCUMENTS"
  | "SPONSOR_IDENTITY_DOCUMENTS"
  | "CIVIL_STATUS_DOCUMENTS"
  | "OTHER_CASE_SPECIFIC";

/** Fixed display order — "STEP 1, STEP 2, ..." on the public form and the
 * admin checklist both iterate the catalog in this order, then filter to
 * whatever `resolveDocumentRequirements` actually resolved for the case. */
export const DOCUMENT_REQUIREMENT_ORDER: DocumentRequirementKey[] = [
  "PASSPORT_BIO_PAGE",
  "NATIONAL_ID",
  "VISA_PHOTO",
  "BANK_STATEMENTS",
  "PAYSLIPS",
  "EMPLOYMENT_CERTIFICATE",
  "LEAVE_AUTHORIZATION",
  "BUSINESS_REGISTRATION",
  "STUDENT_CERTIFICATE",
  "PROPERTY_ASSET_EVIDENCE",
  "PROOF_OF_ACCOMMODATION",
  "HOTEL_RESERVATION",
  "INVITATION_LETTER",
  "PROOF_OF_RELATIONSHIP_TO_HOST",
  "SPONSOR_FINANCIAL_DOCUMENTS",
  "SPONSOR_IDENTITY_DOCUMENTS",
  "TRAVEL_ITINERARY",
  "RETURN_FLIGHT_RESERVATION",
  "TRAVEL_MEDICAL_INSURANCE",
  "CIVIL_STATUS_DOCUMENTS",
  "PREVIOUS_VISAS",
  "PREVIOUS_PASSPORTS",
  "OTHER_CASE_SPECIFIC",
];

export type RequirementCatalogEntry = {
  key: DocumentRequirementKey;
  /** Coarse bucket into the existing shared `DocumentCategory` Prisma enum
   * — kept only for backward-compat filtering against other document
   * types in the app; `requirementKey` is the real identifier everywhere
   * else in this feature now. */
  category: DocumentCategory;
  acceptedFormats: ("IMAGE" | "PDF")[];
  maxSizeBytes: number;
};

export const DOCUMENT_REQUIREMENT_CATALOG: Record<DocumentRequirementKey, RequirementCatalogEntry> = {
  PASSPORT_BIO_PAGE: { key: "PASSPORT_BIO_PAGE", category: "PASSPORT", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  NATIONAL_ID: { key: "NATIONAL_ID", category: "NATIONAL_ID", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  VISA_PHOTO: { key: "VISA_PHOTO", category: "IMAGE", acceptedFormats: ["IMAGE"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  PROOF_OF_ACCOMMODATION: { key: "PROOF_OF_ACCOMMODATION", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  HOTEL_RESERVATION: { key: "HOTEL_RESERVATION", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  INVITATION_LETTER: { key: "INVITATION_LETTER", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  PROOF_OF_RELATIONSHIP_TO_HOST: { key: "PROOF_OF_RELATIONSHIP_TO_HOST", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  BANK_STATEMENTS: { key: "BANK_STATEMENTS", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  PAYSLIPS: { key: "PAYSLIPS", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  EMPLOYMENT_CERTIFICATE: { key: "EMPLOYMENT_CERTIFICATE", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  LEAVE_AUTHORIZATION: { key: "LEAVE_AUTHORIZATION", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  BUSINESS_REGISTRATION: { key: "BUSINESS_REGISTRATION", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  STUDENT_CERTIFICATE: { key: "STUDENT_CERTIFICATE", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  PROPERTY_ASSET_EVIDENCE: { key: "PROPERTY_ASSET_EVIDENCE", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  TRAVEL_ITINERARY: { key: "TRAVEL_ITINERARY", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  RETURN_FLIGHT_RESERVATION: { key: "RETURN_FLIGHT_RESERVATION", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  TRAVEL_MEDICAL_INSURANCE: { key: "TRAVEL_MEDICAL_INSURANCE", category: "INSURANCE", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  PREVIOUS_VISAS: { key: "PREVIOUS_VISAS", category: "VISA", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  PREVIOUS_PASSPORTS: { key: "PREVIOUS_PASSPORTS", category: "PASSPORT", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  SPONSOR_FINANCIAL_DOCUMENTS: { key: "SPONSOR_FINANCIAL_DOCUMENTS", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  SPONSOR_IDENTITY_DOCUMENTS: { key: "SPONSOR_IDENTITY_DOCUMENTS", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  CIVIL_STATUS_DOCUMENTS: { key: "CIVIL_STATUS_DOCUMENTS", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
  OTHER_CASE_SPECIFIC: { key: "OTHER_CASE_SPECIFIC", category: "OTHER", acceptedFormats: ["IMAGE", "PDF"], maxSizeBytes: MAX_VISA_DOCUMENT_BYTES },
};

export type VisaCaseInput = {
  destinationCountry: string; // ISO 3166-1 alpha-2
  countryOfResidence: string; // ISO 3166-1 alpha-2
  purposeOfTravel: VisaTravelPurpose;
  employmentStatus: VisaEmploymentStatus;
  accommodationType: VisaAccommodationType;
  payerType: VisaPayerType;
  hasPreviousTravel: boolean;
};

export type ResolvedRequirement = { status: RequirementStatus } & RequirementCatalogEntry;

export type RuleSetId = "SCHENGEN" | "USA" | "CANADA" | "AUSTRALIA" | "UNCONFIGURED";

export type ResolvedChecklist = {
  ruleSetId: RuleSetId;
  /** True when the destination has no configured rule set — the UI must
   * show the "our visa team will review your case" fallback copy instead
   * of presenting `requirements` as a confident, destination-specific
   * checklist (item #12 of the product spec). */
  isFallback: boolean;
  requirements: ResolvedRequirement[];
};

const STATUS_STRICTNESS: Record<RequirementStatus, number> = {
  IF_APPLICABLE: 0,
  OPTIONAL: 1,
  REQUIRED: 2,
};

function stricter(a: RequirementStatus, b: RequirementStatus): RequirementStatus {
  return STATUS_STRICTNESS[a] >= STATUS_STRICTNESS[b] ? a : b;
}

type Rule = { key: DocumentRequirementKey; when: (c: VisaCaseInput) => boolean; status: RequirementStatus };

/**
 * Baseline rules — evaluated for EVERY case, including unconfigured
 * destinations. Nothing here claims destination-specific knowledge: a
 * valid passport is universally required to cross any border, and the
 * IF_APPLICABLE items are hedges ("if you have one, show it") rather than
 * assertions that a specific consulate demands them.
 */
const BASELINE_RULES: Rule[] = [
  { key: "PASSPORT_BIO_PAGE", when: () => true, status: "REQUIRED" },
  { key: "NATIONAL_ID", when: () => true, status: "IF_APPLICABLE" },
  { key: "PREVIOUS_VISAS", when: () => true, status: "IF_APPLICABLE" },
  { key: "PREVIOUS_PASSPORTS", when: () => true, status: "IF_APPLICABLE" },
  { key: "OTHER_CASE_SPECIFIC", when: () => true, status: "IF_APPLICABLE" },
];

/**
 * Shared conditional logic reused across every configured rule set below —
 * "who pays" / "where you stay" / "employment status" branch the same way
 * regardless of destination; only the destination-specific items (visa
 * photo, itinerary, insurance, ...) differ per rule set. Kept as one
 * function so a fix to, say, the sponsor/host branching doesn't need to be
 * copy-pasted four times.
 *
 * Calibration note (post-research revision — see the research summary
 * delivered 2026-08-11, citing home-affairs.ec.europa.eu,
 * service-public.gouv.fr, eur-lex.europa.eu, travel.state.gov, canada.ca,
 * and immi.homeaffairs.gov.au): the ACCOMMODATION rules below (hotel vs.
 * hosted-by-family/friend vs. own-property) are the most strongly and
 * consistently sourced across all four destinations, so they stay
 * REQUIRED. The financial-proof rule ("prove you can afford the trip") is
 * also explicitly required everywhere, in some form, for self-payers.
 *
 * By contrast, none of the four official sources names a specific document
 * like "employment certificate" or "payslips" as a mandatory, named,
 * universal line item — employment/business/study status is evidence
 * *supporting* the required "financial means" / "ties to home country"
 * showing, not a separately mandated document in its own right (e.g.
 * travel.state.gov: "evidence of your employment... MAY be sufficient";
 * France-Visas explicitly states its per-employment-status document lists
 * are generated dynamically per case, not published statically). Per the
 * product requirement to never hard-code a document as REQUIRED without a
 * source that actually says so, these are calibrated OPTIONAL — strongly
 * recommended supporting evidence, not a submission blocker.
 */
function sharedConditionalRules(): Rule[] {
  return [
    // Accommodation — the most consistently and explicitly sourced branch:
    // service-public.gouv.fr distinguishes hotel proof from the "certificate
    // of acceptance" required for a private/family stay; Canada's
    // apply-visitor-visa.html requires an invitation letter + relationship
    // proof (marriage/birth certificate, etc.) specifically for family
    // visits; Australia's Tourist stream page gives the same split
    // verbatim, including the sponsor/host distinction (see payer rules
    // below).
    { key: "HOTEL_RESERVATION", when: (c) => c.accommodationType === "HOTEL", status: "REQUIRED" },
    { key: "PROOF_OF_ACCOMMODATION", when: (c) => c.accommodationType === "HOTEL", status: "REQUIRED" },
    { key: "INVITATION_LETTER", when: (c) => c.accommodationType === "HOSTED_BY_FAMILY_OR_FRIEND", status: "REQUIRED" },
    { key: "PROOF_OF_RELATIONSHIP_TO_HOST", when: (c) => c.accommodationType === "HOSTED_BY_FAMILY_OR_FRIEND", status: "REQUIRED" },
    { key: "CIVIL_STATUS_DOCUMENTS", when: (c) => c.accommodationType === "HOSTED_BY_FAMILY_OR_FRIEND", status: "IF_APPLICABLE" },
    { key: "PROPERTY_ASSET_EVIDENCE", when: (c) => c.accommodationType === "OWN_PROPERTY", status: "REQUIRED" },

    // Employment / financial standing — supporting evidence, not named as
    // its own mandatory document by any of the four sources (see function
    // comment). Bank statements are the one item every source does treat
    // as required for self-funded travel (Schengen: "proof of your
    // livelihood"; Canada: "have enough money for your stay" is an
    // eligibility criterion; Australia: itemised bank statements listed
    // explicitly as genuine-visitor evidence).
    { key: "EMPLOYMENT_CERTIFICATE", when: (c) => c.employmentStatus === "EMPLOYED", status: "OPTIONAL" },
    { key: "PAYSLIPS", when: (c) => c.employmentStatus === "EMPLOYED", status: "OPTIONAL" },
    { key: "LEAVE_AUTHORIZATION", when: (c) => c.employmentStatus === "EMPLOYED", status: "OPTIONAL" },
    { key: "BUSINESS_REGISTRATION", when: (c) => c.employmentStatus === "SELF_EMPLOYED", status: "OPTIONAL" },
    { key: "BANK_STATEMENTS", when: (c) => c.employmentStatus === "SELF_EMPLOYED", status: "REQUIRED" },
    { key: "STUDENT_CERTIFICATE", when: (c) => c.employmentStatus === "STUDENT", status: "OPTIONAL" },
    { key: "BANK_STATEMENTS", when: (c) => c.employmentStatus === "STUDENT", status: "OPTIONAL" },
    { key: "BANK_STATEMENTS", when: (c) => c.employmentStatus === "RETIRED", status: "REQUIRED" },
    { key: "PROPERTY_ASSET_EVIDENCE", when: (c) => c.employmentStatus === "RETIRED", status: "OPTIONAL" },
    {
      key: "BANK_STATEMENTS",
      when: (c) => (c.employmentStatus === "UNEMPLOYED" || c.employmentStatus === "OTHER") && c.payerType !== "SPONSOR",
      status: "REQUIRED",
    },

    // Who pays vs. who hosts — kept as two independent conditions, never
    // merged (a self-payer can still be hosted, and a sponsored traveller
    // can still stay in a hotel). This split is the most directly and
    // explicitly confirmed design decision in the research: Australia's
    // Tourist stream page states verbatim that the host's invitation
    // letter is separate from "if this person will be paying for your
    // stay, provide proof of their funds" — i.e. hosting and sponsoring
    // are officially treated as two different facts.
    { key: "BANK_STATEMENTS", when: (c) => c.payerType === "SELF", status: "REQUIRED" },
    { key: "SPONSOR_FINANCIAL_DOCUMENTS", when: (c) => c.payerType === "SPONSOR", status: "REQUIRED" },
    { key: "SPONSOR_IDENTITY_DOCUMENTS", when: (c) => c.payerType === "SPONSOR", status: "REQUIRED" },
    { key: "EMPLOYMENT_CERTIFICATE", when: (c) => c.payerType === "EMPLOYER", status: "REQUIRED" },

    // Travel purpose overrides / additions. Note: none of the four
    // researched destinations' *visitor/tourist* visa categories are
    // actually a study or work visa (those are separate visa categories
    // outside this research's scope) — STUDENT_CERTIFICATE/
    // EMPLOYMENT_CERTIFICATE here reflect general common-sense practice
    // for a study/work-purpose trip, not a claim backed by the visitor-visa
    // sources cited elsewhere in this file.
    { key: "STUDENT_CERTIFICATE", when: (c) => c.purposeOfTravel === "STUDY", status: "OPTIONAL" },
    { key: "EMPLOYMENT_CERTIFICATE", when: (c) => c.purposeOfTravel === "WORK", status: "OPTIONAL" },
    { key: "TRAVEL_ITINERARY", when: (c) => c.purposeOfTravel === "TRANSIT", status: "OPTIONAL" },
    { key: "RETURN_FLIGHT_RESERVATION", when: (c) => c.purposeOfTravel === "TRANSIT", status: "OPTIONAL" },

    // Previous-travel disclosure — promoted from the baseline's
    // IF_APPLICABLE to a visible-but-not-mandatory OPTIONAL once the
    // applicant has already told us these documents exist.
    { key: "PREVIOUS_VISAS", when: (c) => c.hasPreviousTravel, status: "OPTIONAL" },
    { key: "PREVIOUS_PASSPORTS", when: (c) => c.hasPreviousTravel, status: "OPTIONAL" },
  ];
}

/**
 * Destination-specific rule sets. Each is grounded in the cited official
 * source for that destination's short-stay/visitor visa category — see the
 * header comment on each entry. Do not add a destination here without a
 * citation; unconfigured destinations correctly fall back to
 * `BASELINE_RULES` only (see `resolveDocumentRequirements`).
 */
const RULE_SETS: Record<Exclude<RuleSetId, "UNCONFIGURED">, Rule[]> = {
  /**
   * Schengen short-stay (Type C) visa. Researched and verified 2026-08-11
   * directly against:
   *  - European Commission, Migration and Home Affairs — "Applying for a
   *    Schengen visa":
   *    https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en
   *  - Service-Public.fr (French PM's office) — "Schengen short-stay visa":
   *    https://www.service-public.gouv.fr/particuliers/vosdroits/F16146?lang=en
   *  - EUR-Lex — Regulation (EC) No 810/2009 (Visa Code), Art. 15:
   *    https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32009R0810
   *
   * Travel medical insurance is LEGALLY MANDATORY with a minimum coverage
   * of EUR 30,000 (EUR-Lex Art. 15, verbatim: "The minimum coverage shall
   * be EUR 30 000"; confirmed independently by service-public.gouv.fr).
   * "Purpose-and-conditions-of-stay documents" and "proof of intent to
   * return (return ticket, or financial means to acquire one)" are both
   * explicitly listed as required, operationalized here as itinerary +
   * return flight reservation. Accommodation proof explicitly splits hotel
   * vs. a "certificate of acceptance" for private/family stays — see the
   * shared accommodation rules above, not duplicated here.
   */
  SCHENGEN: [
    { key: "VISA_PHOTO", when: () => true, status: "REQUIRED" },
    { key: "TRAVEL_ITINERARY", when: () => true, status: "REQUIRED" },
    { key: "RETURN_FLIGHT_RESERVATION", when: () => true, status: "REQUIRED" },
    { key: "TRAVEL_MEDICAL_INSURANCE", when: () => true, status: "REQUIRED" },
  ],
  /**
   * USA nonimmigrant visitor visa (B1/B2). Researched and verified
   * 2026-08-11 directly against:
   *  - travel.state.gov — "Visitor Visa":
   *    https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html
   *  - travel.state.gov — Photo Requirements:
   *    https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html
   *  - travel.state.gov — B-1 Business Visa Fact Sheet:
   *    https://travel.state.gov/content/travel/en/us-visas/business/b-1-fact-sheet.html
   *
   * Beyond the DS-160 form and a compliant photo, the U.S. process is
   * explicitly officer-discretion-driven, verbatim: "Additional documents
   * may be requested to establish if you are qualified" — no fixed
   * document list is published, and no travel-medical-insurance
   * requirement is mentioned anywhere on these pages, so it stays
   * OPTIONAL rather than assumed mandatory.
   */
  USA: [
    { key: "VISA_PHOTO", when: () => true, status: "REQUIRED" },
    { key: "TRAVEL_ITINERARY", when: () => true, status: "OPTIONAL" },
    { key: "RETURN_FLIGHT_RESERVATION", when: () => true, status: "OPTIONAL" },
    { key: "TRAVEL_MEDICAL_INSURANCE", when: () => true, status: "OPTIONAL" },
  ],
  /**
   * Canada visitor visa (temporary resident visa). Researched and verified
   * 2026-08-11 directly against:
   *  - canada.ca — "How to apply for a visitor visa":
   *    https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/apply-visitor-visa.html
   *  - canada.ca — "Eligibility to apply for a visitor visa":
   *    https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eligibility.html
   *  - IRCC Guide 5256 (paper application guide):
   *    https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5256-applying-visitor-visa-temporary-resident-visa.html
   *
   * A photo meeting IRCC specifications is a named form requirement
   * (IMM 5257). No travel-medical-insurance requirement is mentioned for
   * the general visitor stream (only imposed case-by-case via Condition
   * 8501 for certain long-stay grants, out of scope here). Family-visit
   * invitation letter + relationship proof (marriage/birth certificate) is
   * explicit — see the shared accommodation rules above.
   */
  CANADA: [
    { key: "VISA_PHOTO", when: () => true, status: "REQUIRED" },
    { key: "TRAVEL_ITINERARY", when: () => true, status: "OPTIONAL" },
    { key: "RETURN_FLIGHT_RESERVATION", when: () => true, status: "OPTIONAL" },
    { key: "TRAVEL_MEDICAL_INSURANCE", when: () => true, status: "OPTIONAL" },
  ],
  /**
   * Australia visitor visa (subclass 600, Tourist + Business Visitor
   * streams). Researched and verified 2026-08-11 directly against:
   *  - Tourist stream (apply outside Australia):
   *    https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600/tourist-stream-overseas
   *  - Business Visitor stream:
   *    https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600/business-visitor-stream
   *
   * No separate "visa photograph" line item appears in either stream's
   * document list (identity is established via passport pages), so it
   * stays OPTIONAL rather than assumed required. Health insurance is
   * explicitly recommended, not mandatory, verbatim: "we strongly
   * recommended you take out adequate health insurance" (mandatory only
   * under Condition 8501 in specific long-stay grant circumstances, out of
   * scope here). "Evidence you can return home" is one of several
   * ties-to-home-country proofs offered (job, study, family, assets) —
   * not specifically a return-flight booking — so return flight and
   * itinerary both stay OPTIONAL. This is also the source with the
   * clearest, most literal confirmation of the sponsor/host split used
   * throughout this file: "a letter from your relative or friend... If
   * this person will be paying for your stay, provide proof of their
   * funds" — hosting and paying are explicitly two different facts.
   * Property/asset evidence is explicitly listed as one of the accepted
   * "evidence of intent to return" proofs for any applicant, not only
   * OWN_PROPERTY accommodation cases.
   */
  AUSTRALIA: [
    { key: "VISA_PHOTO", when: () => true, status: "OPTIONAL" },
    { key: "TRAVEL_ITINERARY", when: () => true, status: "OPTIONAL" },
    { key: "RETURN_FLIGHT_RESERVATION", when: () => true, status: "OPTIONAL" },
    { key: "TRAVEL_MEDICAL_INSURANCE", when: () => true, status: "OPTIONAL" },
    { key: "PROPERTY_ASSET_EVIDENCE", when: () => true, status: "OPTIONAL" },
  ],
};

/** The Schengen area's member states (ISO 3166-1 alpha-2), incl. the
 * non-EU members (Iceland, Liechtenstein, Norway, Switzerland). A
 * destination code in this set resolves to the SCHENGEN rule set
 * regardless of which member state is selected — short-stay Type C
 * requirements are harmonized under Regulation (EC) No 810/2009, with the
 * per-country document list varying only in minor, non-safety-relevant
 * ways this checklist does not attempt to model. */
export const SCHENGEN_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IS", "IT", "LV", "LI", "LT", "LU", "MT", "NL",
  "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH",
]);

function destinationToRuleSetId(destinationCountry: string): RuleSetId {
  const code = destinationCountry.toUpperCase();
  if (SCHENGEN_COUNTRY_CODES.has(code)) return "SCHENGEN";
  if (code === "US") return "USA";
  if (code === "CA") return "CANADA";
  if (code === "AU") return "AUSTRALIA";
  return "UNCONFIGURED";
}

/**
 * Resolves a visa case to its ordered, per-requirement checklist. Adding a
 * new destination later means adding to `SCHENGEN_COUNTRY_CODES` or a new
 * `RULE_SETS` entry (with its own source citation) — this function's
 * signature and return shape never change.
 *
 * Tie-break: when more than one rule targets the same key (e.g. baseline +
 * a conditional rule), the STRICTEST status wins (REQUIRED > OPTIONAL >
 * IF_APPLICABLE) — a document is never silently downgraded to optional
 * because an unrelated rule also mentioned it.
 */
export function resolveDocumentRequirements(input: VisaCaseInput): ResolvedChecklist {
  const ruleSetId = destinationToRuleSetId(input.destinationCountry);
  const isFallback = ruleSetId === "UNCONFIGURED";

  const rules: Rule[] = isFallback
    ? BASELINE_RULES
    : [...BASELINE_RULES, ...sharedConditionalRules(), ...RULE_SETS[ruleSetId]];

  const resolvedStatus = new Map<DocumentRequirementKey, RequirementStatus>();
  for (const rule of rules) {
    if (!rule.when(input)) continue;
    const existing = resolvedStatus.get(rule.key);
    resolvedStatus.set(rule.key, existing ? stricter(existing, rule.status) : rule.status);
  }

  const requirements: ResolvedRequirement[] = DOCUMENT_REQUIREMENT_ORDER.filter((key) => resolvedStatus.has(key)).map(
    (key) => ({ ...DOCUMENT_REQUIREMENT_CATALOG[key], status: resolvedStatus.get(key)! }),
  );

  return { ruleSetId, isFallback, requirements };
}

export type CompletenessResult = {
  requiredTotal: number;
  requiredSatisfied: number;
  missingRequired: DocumentRequirementKey[];
  optionalPresent: DocumentRequirementKey[];
};

/**
 * Never returns a "complete" verdict — only a satisfied/total count and
 * the exact missing keys. Whether a visa CASE is ready to submit to a
 * consulate is a human staff judgment call every time; this function only
 * answers "did the applicant upload what the checklist asked for."
 */
export function computeCompleteness(
  checklist: ResolvedChecklist,
  documents: { requirementKey: DocumentRequirementKey | null }[],
): CompletenessResult {
  const submittedKeys = new Set(documents.map((d) => d.requirementKey).filter((k): k is DocumentRequirementKey => k !== null));

  const required = checklist.requirements.filter((r) => r.status === "REQUIRED");
  const optional = checklist.requirements.filter((r) => r.status === "OPTIONAL");

  return {
    requiredTotal: required.length,
    requiredSatisfied: required.filter((r) => submittedKeys.has(r.key)).length,
    missingRequired: required.filter((r) => !submittedKeys.has(r.key)).map((r) => r.key),
    optionalPresent: optional.filter((r) => submittedKeys.has(r.key)).map((r) => r.key),
  };
}
