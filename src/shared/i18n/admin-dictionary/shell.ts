import { type Locale } from "@/shared/i18n/dictionary";

/**
 * Standalone copy of `admin-dictionary.ts`'s `shell` section, so
 * `DashboardShell` (a client component rendered by the admin layout on
 * every single admin page) doesn't have to import the ~90KB monolithic
 * admin dictionary just to render ~20 sidebar nav labels. See
 * `admin-dictionary.ts`'s own `shell` block for the source of truth this
 * was copied from — kept in sync manually for now; a follow-up should
 * have the monolith import *from* here instead of duplicating.
 */
export type ShellDict = {
  nav: {
    overview: string;
    sales: string;
    operations: string;
    inventory: string;
    system: string;
    dashboard: string;
    customers: string;
    leads: string;
    bookingRequests: string;
    quotes: string;
    bookings: string;
    documents: string;
    packages: string;
    flights: string;
    hotels: string;
    transportation: string;
    guides: string;
    suppliers: string;
    activities: string;
    destinations: string;
    settings: string;
  };
  openMenu: string;
  signOut: string;
  roleLabels: Record<"OWNER" | "ADMIN" | "AGENT" | "READ_ONLY", string>;
  searchPlaceholder: string;
  languageLabel: string;
};

const ar: ShellDict = {
  nav: {
    overview: "نظرة عامة",
    sales: "المبيعات",
    operations: "العمليات",
    inventory: "المخزون",
    system: "النظام",
    dashboard: "لوحة التحكم",
    customers: "العملاء",
    leads: "العملاء المحتملون",
    bookingRequests: "طلبات الحجز",
    quotes: "عروض الأسعار",
    bookings: "الحجوزات",
    documents: "المستندات",
    packages: "الباقات",
    flights: "الرحلات الجوية",
    hotels: "الفنادق",
    transportation: "النقل",
    guides: "المرشدون السياحيون",
    suppliers: "الموردون",
    activities: "الأنشطة",
    destinations: "الوجهات",
    settings: "الإعدادات",
  },
  openMenu: "فتح قائمة التنقل",
  signOut: "تسجيل الخروج",
  roleLabels: { OWNER: "المالك", ADMIN: "مدير", AGENT: "وكيل", READ_ONLY: "قراءة فقط" },
  searchPlaceholder: "بحث…",
  languageLabel: "اللغة",
};

const fr: ShellDict = {
  nav: {
    overview: "Aperçu",
    sales: "Ventes",
    operations: "Opérations",
    inventory: "Inventaire",
    system: "Système",
    dashboard: "Tableau de bord",
    customers: "Clients",
    leads: "Prospects",
    bookingRequests: "Demandes de réservation",
    quotes: "Devis",
    bookings: "Réservations",
    documents: "Documents",
    packages: "Forfaits",
    flights: "Vols",
    hotels: "Hôtels",
    transportation: "Transport",
    guides: "Guides",
    suppliers: "Fournisseurs",
    activities: "Activités",
    destinations: "Destinations",
    settings: "Paramètres",
  },
  openMenu: "Ouvrir le menu de navigation",
  signOut: "Déconnexion",
  roleLabels: { OWNER: "Propriétaire", ADMIN: "Administrateur", AGENT: "Agent", READ_ONLY: "Lecture seule" },
  searchPlaceholder: "Rechercher…",
  languageLabel: "Langue",
};

export function getShellDict(locale: Locale): ShellDict {
  return locale === "fr" ? fr : ar;
}
