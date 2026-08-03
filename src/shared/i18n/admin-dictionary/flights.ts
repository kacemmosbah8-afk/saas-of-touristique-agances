import { type Locale } from "@/shared/i18n/dictionary";

/**
 * Standalone copy of `admin-dictionary.ts`'s `flights` section, so flight
 * admin client components (the wizard form, list, filter bar, edit tabs,
 * status actions/badge) don't have to import the ~90KB monolithic admin
 * dictionary just for flight-specific strings. See `admin-dictionary.ts`'s
 * own `flights` block for the source of truth this was copied from — kept
 * in sync manually for now; a follow-up should have the monolith import
 * *from* here instead of duplicating.
 */
export type FlightsDict = {
  pageTitle: string;
  pageSubtitleIntro: string;
  pageSubtitleCount: (count: number) => string;
  addFlight: string;
  addFirstFlight: string;
  searchPlaceholder: string;
  allStatuses: string;
  statusDraft: string;
  statusPublished: string;
  statusArchived: string;
  noMatch: string;
  columnFlight: string;
  columnStatus: string;
  columnRoute: string;
  columnPrice: string;
  columnUpdated: string;
  statusUpdated: string;
  deleted: string;
  newPageTitle: string;
  newPageSubtitle: string;
  lastUpdated: (date: string) => string;
  tabDetails: string;
  tabMedia: string;
  tabStatus: string;
  statusSectionHeading: string;
  statusSectionSubtitle: string;
  publish: string;
  unpublish: string;
  archive: string;
  restoreToDraft: string;
  dangerZoneHeading: string;
  dangerZoneSubtitle: string;
  deleteFlight: string;
  form: {
    nameAr: string;
    nameFr: string;
    optionalFallsBackAr: string;
    urlSlug: string;
    featured: string;
    featuredDescription: string;
    shortDescriptionAr: string;
    shortDescriptionFr: string;
    descriptionAr: string;
    descriptionFr: string;
    airline: string;
    flightNumber: string;
    departureCityAr: string;
    departureCityFr: string;
    optionalFallsBackArShort: string;
    departureAirportAr: string;
    departureAirportFr: string;
    departureCountryAr: string;
    departureCountryFr: string;
    departureTime: string;
    arrivalCityAr: string;
    arrivalCityFr: string;
    arrivalAirportAr: string;
    arrivalAirportFr: string;
    arrivalCountryAr: string;
    arrivalCountryFr: string;
    arrivalTime: string;
    durationMinutes: string;
    stops: string;
    stopsHint: string;
    cabinClass: string;
    notSet: string;
    basePrice: string;
    currency: string;
    saving: string;
    createFlight: string;
    savingDraft: string;
    saveDraft: string;
    saveDetails: string;
    created: string;
    saved: string;
    cancel: string;
    publicationStatus: string;
    publicationStatusHint: string;
    newFlightDraftHint: string;
    pictureRequired: string;
    fixErrorsBeforePublishing: string;
    recommended: string;
    urlSlugCollapsedHint: string;
    previous: string;
    next: string;
    publishFlight: string;
    publishing: string;
    stepIndicator: (step: number, total: number) => string;
    reviewCoverImage: string;
    reviewGalleryCount: (count: number) => string;
    reviewNoMedia: string;
    sections: {
      general: string;
      generalHint: string;
      description: string;
      route: string;
      routeHint: string;
      schedule: string;
      scheduleHint: string;
      airline: string;
      airlineHint: string;
      pricing: string;
      pricingHint: string;
      media: string;
      mediaHint: string;
      review: string;
      reviewHint: string;
      departure: string;
      arrival: string;
    };
  };
  cabinClasses: {
    economy: string;
    premiumEconomy: string;
    business: string;
    first: string;
  };
};

const ar: FlightsDict = {
  pageTitle: "الرحلات الجوية",
  pageSubtitleIntro:
    "رحلة قائمة بذاتها من نقطة إلى نقطة — دون فندق أو برنامج رحلة مرفق. استخدموها للعملاء الذين يحتاجون النقل فقط ويرتّبون إقامتهم بأنفسهم.",
  pageSubtitleCount: (count) => `${count} ${count === 1 ? "رحلة" : "رحلات"} في مساحة عملكم.`,
  addFlight: "رحلة جديدة",
  addFirstFlight: "إضافة أول رحلة",
  searchPlaceholder: "بحث في الرحلات وشركات الطيران والمدن…",
  allStatuses: "كل الحالات",
  statusDraft: "مسودة",
  statusPublished: "منشور",
  statusArchived: "مؤرشف",
  noMatch: "لا توجد رحلات مطابقة لعوامل التصفية.",
  columnFlight: "الرحلة",
  columnStatus: "الحالة",
  columnRoute: "المسار",
  columnPrice: "السعر",
  columnUpdated: "آخر تحديث",
  statusUpdated: "تم تحديث الحالة.",
  deleted: "تم حذف الرحلة.",
  newPageTitle: "رحلة جديدة",
  newPageSubtitle: "أضيفوا مسارًا جديدًا. يمكنكم نشره عند اكتماله.",
  lastUpdated: (date) => `آخر تحديث ${date}`,
  tabDetails: "التفاصيل",
  tabMedia: "الوسائط",
  tabStatus: "الحالة",
  statusSectionHeading: "الحالة",
  statusSectionSubtitle: "التحكم بظهور هذه الرحلة في الموقع العام.",
  publish: "نشر",
  unpublish: "إلغاء النشر",
  archive: "أرشفة",
  restoreToDraft: "إعادة إلى مسودة",
  dangerZoneHeading: "منطقة الخطر",
  dangerZoneSubtitle: "حذف الرحلة نهائي ولا يمكن التراجع عنه.",
  deleteFlight: "حذف الرحلة",
  form: {
    nameAr: "اسم الرحلة (بالعربية)",
    nameFr: "اسم الرحلة (بالفرنسية)",
    optionalFallsBackAr: "اختياري — يعتمد على النسخة العربية إن تُرك فارغًا.",
    urlSlug: "رابط URL",
    featured: "رحلة مميزة",
    featuredDescription: "تُعرض الرحلات المميزة بشكل بارز في موقع الوكالة العام.",
    shortDescriptionAr: "وصف مختصر (بالعربية)",
    shortDescriptionFr: "وصف مختصر (بالفرنسية)",
    descriptionAr: "الوصف (بالعربية)",
    descriptionFr: "الوصف (بالفرنسية)",
    airline: "شركة الطيران",
    flightNumber: "رقم الرحلة",
    departureCityAr: "مدينة المغادرة (بالعربية)",
    departureCityFr: "مدينة المغادرة (بالفرنسية)",
    optionalFallsBackArShort: "اختياري — يعتمد على العربية.",
    departureAirportAr: "مطار المغادرة (بالعربية)",
    departureAirportFr: "مطار المغادرة (بالفرنسية)",
    departureCountryAr: "دولة المغادرة (بالعربية)",
    departureCountryFr: "دولة المغادرة (بالفرنسية)",
    departureTime: "وقت المغادرة المعتاد",
    arrivalCityAr: "مدينة الوصول (بالعربية)",
    arrivalCityFr: "مدينة الوصول (بالفرنسية)",
    arrivalAirportAr: "مطار الوصول (بالعربية)",
    arrivalAirportFr: "مطار الوصول (بالفرنسية)",
    arrivalCountryAr: "دولة الوصول (بالعربية)",
    arrivalCountryFr: "دولة الوصول (بالفرنسية)",
    arrivalTime: "وقت الوصول المعتاد",
    durationMinutes: "المدة (بالدقائق)",
    stops: "التوقفات",
    stopsHint: "0 = مباشرة / دون توقف",
    cabinClass: "درجة المقصورة",
    notSet: "غير محدد",
    basePrice: "السعر الأساسي",
    currency: "العملة",
    saving: "جارٍ الحفظ…",
    createFlight: "إنشاء رحلة",
    savingDraft: "جارٍ حفظ المسودة…",
    saveDraft: "حفظ كمسودة",
    saveDetails: "حفظ التفاصيل",
    created: "تم إنشاء الرحلة.",
    saved: "تم الحفظ.",
    cancel: "إلغاء",
    publicationStatus: "حالة النشر",
    publicationStatusHint: "غيّروا هذا من تبويب «الحالة» أعلى الصفحة.",
    newFlightDraftHint:
      "تُنشر الرحلة الجديدة تلقائيًا بمجرد توفر سعر وصورة واحدة على الأقل. استخدموا «حفظ كمسودة» للاحتفاظ بها كمسودة دائمًا.",
    pictureRequired: "أضيفوا صورة قبل المتابعة.",
    fixErrorsBeforePublishing: "يوجد أخطاء يجب تصحيحها قبل النشر — تمت إعادتكم إلى الخطوة المعنية.",
    recommended: "موصى به",
    urlSlugCollapsedHint: "يُنشأ تلقائيًا من الاسم — عادةً لا حاجة لتغييره.",
    previous: "السابق",
    next: "التالي",
    publishFlight: "نشر الرحلة",
    publishing: "جارٍ النشر…",
    stepIndicator: (step, total) => `الخطوة ${step} من ${total}`,
    reviewCoverImage: "صورة الغلاف",
    reviewGalleryCount: (count) => `${count} ${count === 1 ? "صورة" : "صور"} في المعرض`,
    reviewNoMedia: "لم تتم إضافة صور بعد.",
    sections: {
      general: "معلومات عامة",
      generalHint: "الاسم والرابط وكيفية ظهور الرحلة في القوائم.",
      description: "الوصف",
      route: "المسار",
      routeHint: "نقطتا المغادرة والوصول.",
      schedule: "الجدول الزمني",
      scheduleHint: "الأوقات والمدة والتوقفات ودرجة المقصورة.",
      airline: "شركة الطيران",
      airlineHint: "شركة الطيران المشغِّلة ورقم الرحلة.",
      pricing: "التسعير",
      pricingHint: "السعر الأساسي والعملة.",
      media: "الوسائط",
      mediaHint: "صورة الغلاف ومعرض الصور.",
      review: "المراجعة",
      reviewHint: "راجعوا كل شيء قبل النشر.",
      departure: "المغادرة",
      arrival: "الوصول",
    },
  },
  cabinClasses: {
    economy: "اقتصادية",
    premiumEconomy: "اقتصادية ممتازة",
    business: "رجال الأعمال",
    first: "الدرجة الأولى",
  },
};

const fr: FlightsDict = {
  pageTitle: "Vols",
  pageSubtitleIntro:
    "Un vol autonome, point à point — sans hôtel ni itinéraire attaché. Utilisez ceci pour les clients qui ont seulement besoin du transport et organisent leur hébergement séparément.",
  pageSubtitleCount: (count) => `${count} vol${count !== 1 ? "s" : ""} dans votre espace de travail.`,
  addFlight: "Nouveau vol",
  addFirstFlight: "Ajouter votre premier vol",
  searchPlaceholder: "Rechercher des vols, compagnies, villes…",
  allStatuses: "Tous les statuts",
  statusDraft: "Brouillon",
  statusPublished: "Publié",
  statusArchived: "Archivé",
  noMatch: "Aucun vol ne correspond à vos filtres.",
  columnFlight: "Vol",
  columnStatus: "Statut",
  columnRoute: "Itinéraire",
  columnPrice: "Prix",
  columnUpdated: "Mis à jour",
  statusUpdated: "Statut mis à jour.",
  deleted: "Vol supprimé.",
  newPageTitle: "Nouveau vol",
  newPageSubtitle: "Ajoutez un nouvel itinéraire. Vous pourrez le publier une fois prêt.",
  lastUpdated: (date) => `Mis à jour le ${date}`,
  tabDetails: "Détails",
  tabMedia: "Médias",
  tabStatus: "Statut",
  statusSectionHeading: "Statut",
  statusSectionSubtitle: "Contrôlez la visibilité de ce vol sur le site public.",
  publish: "Publier",
  unpublish: "Dépublier",
  archive: "Archiver",
  restoreToDraft: "Remettre en brouillon",
  dangerZoneHeading: "Zone de danger",
  dangerZoneSubtitle: "La suppression d'un vol est définitive et irréversible.",
  deleteFlight: "Supprimer le vol",
  form: {
    nameAr: "Nom du vol (arabe)",
    nameFr: "Nom du vol (français)",
    optionalFallsBackAr: "Optionnel — reprend la version arabe si laissé vide.",
    urlSlug: "Slug d'URL",
    featured: "Vol en vedette",
    featuredDescription: "Les vols en vedette sont mis en avant sur le site de l'agence.",
    shortDescriptionAr: "Description courte (arabe)",
    shortDescriptionFr: "Description courte (français)",
    descriptionAr: "Description (arabe)",
    descriptionFr: "Description (français)",
    airline: "Compagnie aérienne",
    flightNumber: "Numéro de vol",
    departureCityAr: "Ville de départ (arabe)",
    departureCityFr: "Ville de départ (français)",
    optionalFallsBackArShort: "Optionnel — reprend l'arabe.",
    departureAirportAr: "Aéroport de départ (arabe)",
    departureAirportFr: "Aéroport de départ (français)",
    departureCountryAr: "Pays de départ (arabe)",
    departureCountryFr: "Pays de départ (français)",
    departureTime: "Heure de départ habituelle",
    arrivalCityAr: "Ville d'arrivée (arabe)",
    arrivalCityFr: "Ville d'arrivée (français)",
    arrivalAirportAr: "Aéroport d'arrivée (arabe)",
    arrivalAirportFr: "Aéroport d'arrivée (français)",
    arrivalCountryAr: "Pays d'arrivée (arabe)",
    arrivalCountryFr: "Pays d'arrivée (français)",
    arrivalTime: "Heure d'arrivée habituelle",
    durationMinutes: "Durée (minutes)",
    stops: "Escales",
    stopsHint: "0 = direct / sans escale",
    cabinClass: "Classe de cabine",
    notSet: "Non défini",
    basePrice: "Prix de base",
    currency: "Devise",
    saving: "Enregistrement…",
    createFlight: "Créer le vol",
    savingDraft: "Enregistrement du brouillon…",
    saveDraft: "Enregistrer comme brouillon",
    saveDetails: "Enregistrer les détails",
    created: "Vol créé.",
    saved: "Enregistré.",
    cancel: "Annuler",
    publicationStatus: "Statut de publication",
    publicationStatusHint: "Modifiez ceci depuis l'onglet « Statut » en haut de la page.",
    newFlightDraftHint:
      "Les nouveaux vols sont publiés automatiquement dès qu'ils ont un prix et au moins une photo. Utilisez « Enregistrer comme brouillon » pour le garder en brouillon quoi qu'il arrive.",
    pictureRequired: "Ajoutez une photo avant de continuer.",
    fixErrorsBeforePublishing:
      "Certaines erreurs doivent être corrigées avant de publier — vous avez été ramené à l'étape concernée.",
    recommended: "Recommandé",
    urlSlugCollapsedHint: "Généré automatiquement à partir du nom — rarement besoin d'y toucher.",
    previous: "Précédent",
    next: "Suivant",
    publishFlight: "Publier le vol",
    publishing: "Publication…",
    stepIndicator: (step, total) => `Étape ${step} sur ${total}`,
    reviewCoverImage: "Image de couverture",
    reviewGalleryCount: (count) => `${count} photo${count !== 1 ? "s" : ""} dans la galerie`,
    reviewNoMedia: "Aucune photo ajoutée pour l'instant.",
    sections: {
      general: "Informations générales",
      generalHint: "Le nom, le slug et la façon dont le vol apparaît dans les listes.",
      description: "Description",
      route: "Itinéraire",
      routeHint: "Les points de départ et d'arrivée.",
      schedule: "Horaires",
      scheduleHint: "Heures, durée, escales et classe de cabine.",
      airline: "Compagnie aérienne",
      airlineHint: "La compagnie qui opère le vol et son numéro.",
      pricing: "Tarification",
      pricingHint: "Le prix de base et la devise.",
      media: "Médias",
      mediaHint: "Image de couverture et galerie.",
      review: "Vérification",
      reviewHint: "Vérifiez tout avant de publier.",
      departure: "Départ",
      arrival: "Arrivée",
    },
  },
  cabinClasses: {
    economy: "Économique",
    premiumEconomy: "Économique premium",
    business: "Affaires",
    first: "Première",
  },
};

export function getFlightsDict(locale: Locale): FlightsDict {
  return locale === "fr" ? fr : ar;
}
