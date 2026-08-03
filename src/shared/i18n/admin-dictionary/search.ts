import { type Locale } from "@/shared/i18n/dictionary";

/**
 * Standalone copy of `admin-dictionary.ts`'s `search` section. Small, but
 * `GlobalSearchBox` renders inside `DashboardShell` on every single admin
 * page via the shared layout — same reasoning as `shell.ts`/`common.ts`.
 * See `admin-dictionary.ts`'s own `search` block for the source of truth
 * this was copied from — kept in sync manually for now; a follow-up
 * should have the monolith import *from* here instead of duplicating.
 */
export type SearchDict = {
  pageTitle: string;
  pageSubtitle: string;
  defaultPlaceholder: string;
  ariaLabel: string;
  typeToSearch: string;
  noResults: (query: string) => string;
};

const ar: SearchDict = {
  pageTitle: "البحث",
  pageSubtitle: "البحث في الباقات، الفنادق، الأنشطة، المرشدين، الموردين، والوجهات.",
  defaultPlaceholder: "بحث في الفنادق، الأنشطة، المرشدين…",
  ariaLabel: "بحث",
  typeToSearch: "اكتب حرفين على الأقل للبحث.",
  noResults: (query) => `لا توجد نتائج لـ «${query}».`,
};

const fr: SearchDict = {
  pageTitle: "Recherche",
  pageSubtitle: "Rechercher parmi les forfaits, hôtels, activités, guides, fournisseurs et destinations.",
  defaultPlaceholder: "Rechercher des hôtels, activités, guides…",
  ariaLabel: "Rechercher",
  typeToSearch: "Tapez au moins 2 caractères pour rechercher.",
  noResults: (query) => `Aucun résultat pour « ${query} ».`,
};

export function getSearchDict(locale: Locale): SearchDict {
  return locale === "fr" ? fr : ar;
}
