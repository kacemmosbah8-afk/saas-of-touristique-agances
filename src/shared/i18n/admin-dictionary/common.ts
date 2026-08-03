import { type Locale } from "@/shared/i18n/dictionary";

/**
 * Standalone copy of `admin-dictionary.ts`'s `common` section — small,
 * genuinely shared across every admin feature, so it's kept as its own
 * narrow module rather than forcing client components to pull the ~90KB
 * monolithic admin dictionary just for strings like "Save"/"Cancel"/"Edit".
 * See `admin-dictionary.ts`'s own `common` block for the source of truth
 * this was copied from — kept in sync manually for now; a follow-up
 * should have the monolith import *from* here instead of duplicating.
 */
export type CommonDict = {
  save: string;
  saving: string;
  cancel: string;
  delete: string;
  edit: string;
  view: string;
  new: string;
  add: string;
  search: string;
  filter: string;
  allStatuses: string;
  actions: string;
  loading: string;
  noResults: string;
  confirmDeleteTitle: string;
  confirmDeleteBody: string;
  createdOn: string;
  updatedOn: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  total: string;
  inYourWorkspace: string;
  somethingWentWrong: string;
  changesSaved: string;
  backToList: string;
  confirmContinue: string;
  restore: string;
  setActive: string;
  setInactive: string;
  archive: string;
  addItem: string;
  remove: string;
  media: {
    coverImageTitle: string;
    coverImageDescription: string;
    galleryTitle: string;
    galleryDescription: string;
    dropToReplace: string;
    dropToUpload: string;
    dragAndDropOrClickUpload: string;
    dragAndDropOrClickAdd: string;
    replace: string;
    addImages: string;
    addMore: string;
    uploading: string;
    noImages: string;
    dropToAdd: string;
    removeImageAria: string;
    failedToSaveImage: string;
    imageUpdated: string;
    failedToRemoveImage: string;
    imageRemoved: string;
    someImagesFailed: string;
    imagesAdded: (count: number) => string;
    uploadFailedPrefix: string;
    addPhotosOrDrag: string;
  };
  pagination: {
    showing: (start: number, end: number, total: number) => string;
    page: (page: number, pageCount: number) => string;
    previous: string;
    next: string;
  };
  filterBar: {
    sortNewest: string;
    sortOldest: string;
    sortNameAsc: string;
    sortNameDesc: string;
    sortPlaceholder: string;
    clear: string;
  };
};

const ar: CommonDict = {
  save: "حفظ",
  saving: "جارٍ الحفظ…",
  cancel: "إلغاء",
  delete: "حذف",
  edit: "تعديل",
  view: "عرض",
  new: "جديد",
  add: "إضافة",
  search: "بحث",
  filter: "تصفية",
  allStatuses: "كل الحالات",
  actions: "إجراءات",
  loading: "جارٍ التحميل…",
  noResults: "لا توجد نتائج.",
  confirmDeleteTitle: "تأكيد الحذف",
  confirmDeleteBody: "هذا الإجراء لا يمكن التراجع عنه.",
  createdOn: "تاريخ الإنشاء",
  updatedOn: "آخر تحديث",
  status: "الحالة",
  name: "الاسم",
  email: "البريد الإلكتروني",
  phone: "الهاتف",
  notes: "ملاحظات",
  total: "الإجمالي",
  inYourWorkspace: "في مساحة عملكم",
  somethingWentWrong: "حدث خطأ ما.",
  changesSaved: "تم حفظ التغييرات.",
  backToList: "العودة إلى القائمة",
  confirmContinue: "متابعة",
  restore: "استعادة",
  setActive: "تفعيل",
  setInactive: "إلغاء التفعيل",
  archive: "أرشفة",
  addItem: "إضافة عنصر…",
  remove: "إزالة",
  media: {
    coverImageTitle: "صورة الغلاف",
    coverImageDescription: "الحجم الموصى به: 1200×630 بكسل.",
    galleryTitle: "معرض الصور",
    galleryDescription: "صور إضافية تظهر في صفحة التفاصيل.",
    dropToReplace: "أفلت للاستبدال",
    dropToUpload: "أفلت للرفع",
    dragAndDropOrClickUpload: "اسحب وأفلت، أو انقر للرفع",
    dragAndDropOrClickAdd: "اسحب وأفلت، أو انقر لإضافة صور",
    replace: "استبدال",
    addImages: "إضافة صور",
    addMore: "إضافة المزيد",
    uploading: "جارٍ الرفع…",
    noImages: "لا توجد صور.",
    dropToAdd: "أفلت للإضافة",
    removeImageAria: "إزالة الصورة",
    failedToSaveImage: "فشل حفظ الصورة.",
    imageUpdated: "تم تحديث الصورة.",
    failedToRemoveImage: "فشل إزالة الصورة.",
    imageRemoved: "تمت إزالة الصورة.",
    someImagesFailed: "فشل حفظ بعض الصور.",
    imagesAdded: (count) => `تمت إضافة ${count} ${count === 1 ? "صورة" : "صور"}.`,
    uploadFailedPrefix: "فشل الرفع:",
    addPhotosOrDrag: "إضافة صور (أو السحب والإفلات)",
  },
  pagination: {
    showing: (start, end, total) => `عرض ${start}–${end} من ${total}`,
    page: (page, pageCount) => `الصفحة ${page} من ${pageCount}`,
    previous: "السابق",
    next: "التالي",
  },
  filterBar: {
    sortNewest: "الأحدث أولاً",
    sortOldest: "الأقدم أولاً",
    sortNameAsc: "الاسم أ–ي",
    sortNameDesc: "الاسم ي–أ",
    sortPlaceholder: "ترتيب حسب",
    clear: "مسح",
  },
};

const fr: CommonDict = {
  save: "Enregistrer",
  saving: "Enregistrement…",
  cancel: "Annuler",
  delete: "Supprimer",
  edit: "Modifier",
  view: "Voir",
  new: "Nouveau",
  add: "Ajouter",
  search: "Rechercher",
  filter: "Filtrer",
  allStatuses: "Tous les statuts",
  actions: "Actions",
  loading: "Chargement…",
  noResults: "Aucun résultat.",
  confirmDeleteTitle: "Confirmer la suppression",
  confirmDeleteBody: "Cette action est irréversible.",
  createdOn: "Créé le",
  updatedOn: "Mis à jour le",
  status: "Statut",
  name: "Nom",
  email: "E-mail",
  phone: "Téléphone",
  notes: "Notes",
  total: "Total",
  inYourWorkspace: "dans votre espace de travail",
  somethingWentWrong: "Une erreur s'est produite.",
  changesSaved: "Modifications enregistrées.",
  backToList: "Retour à la liste",
  confirmContinue: "Continuer",
  restore: "Restaurer",
  setActive: "Activer",
  setInactive: "Désactiver",
  archive: "Archiver",
  addItem: "Ajouter un élément…",
  remove: "Retirer",
  media: {
    coverImageTitle: "Image de couverture",
    coverImageDescription: "Recommandé : 1200×630px.",
    galleryTitle: "Galerie",
    galleryDescription: "Images supplémentaires affichées sur la page de détail.",
    dropToReplace: "Déposer pour remplacer",
    dropToUpload: "Déposer pour téléverser",
    dragAndDropOrClickUpload: "Glissez-déposez, ou cliquez pour téléverser",
    dragAndDropOrClickAdd: "Glissez-déposez, ou cliquez pour ajouter des images",
    replace: "Remplacer",
    addImages: "Ajouter des images",
    addMore: "Ajouter plus",
    uploading: "Téléversement…",
    noImages: "Aucune image.",
    dropToAdd: "Déposer pour ajouter",
    removeImageAria: "Supprimer l'image",
    failedToSaveImage: "Échec de l'enregistrement de l'image.",
    imageUpdated: "Image mise à jour.",
    failedToRemoveImage: "Échec de la suppression de l'image.",
    imageRemoved: "Image supprimée.",
    someImagesFailed: "Certaines images n'ont pas pu être enregistrées.",
    imagesAdded: (count) => `${count} image${count !== 1 ? "s" : ""} ajoutée${count !== 1 ? "s" : ""}.`,
    uploadFailedPrefix: "Échec du téléversement :",
    addPhotosOrDrag: "Ajouter des photos (ou glisser-déposer)",
  },
  pagination: {
    showing: (start, end, total) => `Affichage de ${start}–${end} sur ${total}`,
    page: (page, pageCount) => `Page ${page} sur ${pageCount}`,
    previous: "Précédent",
    next: "Suivant",
  },
  filterBar: {
    sortNewest: "Plus récent",
    sortOldest: "Plus ancien",
    sortNameAsc: "Nom A–Z",
    sortNameDesc: "Nom Z–A",
    sortPlaceholder: "Trier par",
    clear: "Effacer",
  },
};

export function getCommonDict(locale: Locale): CommonDict {
  return locale === "fr" ? fr : ar;
}
