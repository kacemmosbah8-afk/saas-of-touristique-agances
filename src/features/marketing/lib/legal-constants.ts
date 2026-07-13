/**
 * Fixed publication date for the legal pages — deliberately not
 * `new Date()` at render time. An "effective date" on a legal document
 * marks when it was adopted, not when the page happens to be rebuilt;
 * update this constant (and only this constant) when the policies below
 * are next revised.
 */
export const LEGAL_EFFECTIVE_DATE = "July 13, 2026";
