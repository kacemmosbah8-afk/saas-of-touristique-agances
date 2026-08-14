/**
 * Dependency-free message catalog for the public storefront. Arabic is the
 * primary language for every tenant; French is the one secondary language a
 * visitor can switch to. No i18n library — this is a plain lookup table plus
 * `getDictionary(locale)`, intentionally small enough to read end-to-end in
 * one sitting.
 *
 * Copy is written as real travel-agency language in each target language,
 * not a literal string-for-string translation of the English source — the
 * two languages will drift in wording where that reads better, and that's
 * expected, not a bug.
 *
 * This file covers UI chrome only (labels, buttons, section headings, form
 * copy). Admin-entered content (package names, descriptions, highlights...)
 * is a separate system — see `src/shared/lib/i18n/localize.ts` — where the
 * agency writes both languages themselves in the CMS; nothing here ever
 * machine-translates that content.
 */

export type Locale = "ar" | "fr";

export const locales: Locale[] = ["ar", "fr"];
export const defaultLocale: Locale = "ar";

export const localeDir: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
};

export const localeLabel: Record<Locale, string> = {
  ar: "العربية",
  fr: "Français",
};

/** Lives here (not in `shared/lib/i18n/locale.ts`) specifically so that
 * client components can import just the cookie name without dragging in
 * `next/headers` — that module's `cookies()` import is server-only and
 * Next.js rejects it from a `"use client"` file, even transitively. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export type Dictionary = {
  nav: {
    home: string;
    packages: string;
    flights: string;
    hotels: string;
    destinations: string;
    activities: string;
    visaAssistance: string;
    contact: string;
    planTrip: string;
    explore: string;
    menuLabel: string;
    openMenu: string;
    closeMenu: string;
  };
  hero: {
    fallbackTagline: string;
    browsePackages: string;
    planWithUs: string;
    viewTrip: string;
    fromPrice: string;
    perPerson: string;
    dayOne: string;
    dayOther: string;
    nightOne: string;
    nightOther: string;
    previousSlide: string;
    nextSlide: string;
    goToSlide: string;
  };
  differentiators: { title: string; copy: string }[];
  howItWorks: {
    kicker: string;
    title: string;
    steps: { title: string; copy: string }[];
  };
  packages: {
    kicker: string;
    featuredTitle: string;
    ourPackagesTitle: string;
    viewAll: string;
    empty: string;
  };
  destinations: {
    kicker: string;
    title: string;
  };
  storyBreak: {
    kicker: string;
    cta: string;
  };
  visaPromo: {
    kicker: string;
    title: string;
    body: string;
    cta: string;
  };
  exploreMore: {
    title: string;
    subtitle: string;
    flights: string;
    hotels: string;
    activities: string;
    viewAll: string;
  };
  closingCta: {
    title: string;
    subtitle: string;
    contactUs: string;
  };
  footer: {
    followUs: string;
    getInTouch: string;
  };
  /** Simplified singular/plural only — MSA's dual and plural-count
   * agreement rules are more nuanced than this covers; revisit if/when
   * this stat line needs to be grammatically precise rather than readable. */
  stats: {
    tripOne: string;
    tripOther: string;
    destinationOne: string;
    destinationOther: string;
    stayOne: string;
    stayOther: string;
  };
  /** Renders only when the agency has entered at least one real testimonial
   * in settings — never a stand-in for missing content. */
  testimonials: {
    kicker: string;
    title: string;
  };
  /** Shared strings reused across every product detail page (packages,
   * hotels, flights, activities, destinations) so the same concept reads
   * identically everywhere instead of drifting per page. */
  product: {
    from: string;
    perPerson: string;
    perNight: string;
    viewDetails: string;
    requestToBook: string;
    noPaymentShort: string;
    noPaymentLong: string;
    justHaveQuestion: string;
    contactUsInstead: string;
    goodToKnow: string;
    whatsIncludedTitle: string;
    included: string;
    notIncluded: string;
    tripHighlightsKicker: string;
    whatMakesSpecial: string;
    whatToBringTitle: string;
    importantNotesTitle: string;
    meetingPointTitle: string;
    cancellationPolicyTitle: string;
    comfortsExtrasKicker: string;
    amenitiesTitle: string;
    whereYoullStayKicker: string;
    roomOptionsTitle: string;
    sleeps: string;
    bedOne: string;
    bedOther: string;
    departure: string;
    arrival: string;
    direct: string;
    stopOne: string;
    stopOther: string;
    backToPackages: string;
    backToHotels: string;
    backToFlights: string;
    backToActivities: string;
    backToDestinations: string;
    readyToBook: string;
    wantToStay: string;
    interestedInFlight: string;
    interestedIn: string;
    wantToVisit: string;
    tripsTo: string;
    readyMadeKicker: string;
    notToMissKicker: string;
    popularAttractionsTitle: string;
    minuteOne: string;
    minuteOther: string;
    hourOne: string;
    hourOther: string;
    hourAbbr: string;
    minuteAbbr: string;
    itineraryKicker: string;
    itineraryTitle: string;
    dayLabel: string;
    mealBreakfastLabel: string;
    mealLunchLabel: string;
    mealDinnerLabel: string;
    yourGuideTitle: string;
  };
  listing: {
    packages: {
      title: string;
      description: string;
      kickerOne: string;
      kickerOther: string;
      searchPlaceholder: string;
      emptyDefault: string;
      emptySearch: string;
      featuredTrip: string;
      viewPackage: string;
    };
    hotels: {
      title: string;
      description: string;
      kickerOne: string;
      kickerOther: string;
      searchPlaceholder: string;
      emptyDefault: string;
      emptySearch: string;
    };
    flights: {
      title: string;
      description: string;
      kickerOne: string;
      kickerOther: string;
      searchPlaceholder: string;
      emptyDefault: string;
      emptySearch: string;
    };
    destinations: {
      title: string;
      description: string;
      kickerOne: string;
      kickerOther: string;
      searchPlaceholder: string;
      emptyDefault: string;
      emptySearch: string;
    };
    activities: {
      title: string;
      description: string;
      kickerOne: string;
      kickerOther: string;
      searchPlaceholder: string;
      emptyDefault: string;
      emptySearch: string;
    };
  };
  booking: {
    almostThere: string;
    title: string;
    intro: string;
    preferGeneral: string;
    contactLink: string;
    kindLabels: {
      package: string;
      hotel: string;
      destination: string;
      activity: string;
      flight: string;
    };
    requesting: string;
    fullName: string;
    email: string;
    phone: string;
    optionalTag: string;
    whatsapp: string;
    adults: string;
    children: string;
    preferredDate: string;
    returnDate: string;
    notes: string;
    notesPlaceholder: string;
    noPaymentFormNote: string;
    sendButton: string;
    sending: string;
    successTitle: string;
    successBody: string;
    referenceLabel: string;
    responseGeneric: string;
    responseWithHours: string;
    whatsappFaster: string;
    genericError: string;
    listingUnavailable: string;
    backToItem: string;
    browseMore: string;
  };
  visaAssistance: {
    eyebrow: string;
    title: string;
    intro: string;
    selectPlaceholder: string;
    destinationLabel: string;
    nationalityLabel: string;
    visaTypeLabel: string;
    visaTypeTourist: string;
    visaTypeBusiness: string;
    visaTypeTransit: string;
    visaTypeStudent: string;
    visaTypeWork: string;
    visaTypeFamilyVisit: string;
    visaTypeMedical: string;
    visaTypeOther: string;
    travelerCountLabel: string;
    travelStartDate: string;
    travelEndDate: string;
    optionalTag: string;
    fullName: string;
    email: string;
    phone: string;
    phonePlaceholder: string;
    invalidPhone: string;
    whatsapp: string;
    bookingReferenceLabel: string;
    bookingReferencePlaceholder: string;
    travelersSectionTitle: string;
    travellerNumberLabel: string;
    travellerFirstName: string;
    travellerLastName: string;
    dateOfBirth: string;
    travellerNationality: string;
    passportNumber: string;
    passportIssuingCountry: string;
    passportIssueDate: string;
    passportExpiry: string;
    removeFile: string;
    checkingFiles: string;
    pdfQualityNotChecked: string;
    qualityLowResolution: string;
    qualityTooDark: string;
    qualityTooBright: string;
    qualityTooBlurry: string;
    qualityGlare: string;
    qualityCropped: string;
    qualityUnreadable: string;
    notesLabel: string;
    notesPlaceholder: string;
    sendButton: string;
    sending: string;
    successTitle: string;
    successBody: string;
    referenceLabel: string;
    responseGeneric: string;
    responseWithHours: string;
    whatsappFaster: string;
    genericError: string;
    rateLimited: string;
    tooManyFiles: string;
    unsupportedFileType: string;
    fileTooLarge: string;

    // --- Visa case questionnaire (phase 1) ---
    caseDetailsSectionTitle: string;
    countryOfResidenceLabel: string;
    employmentStatusLabel: string;
    employmentStatusEmployed: string;
    employmentStatusSelfEmployed: string;
    employmentStatusStudent: string;
    employmentStatusRetired: string;
    employmentStatusUnemployed: string;
    employmentStatusOther: string;
    accommodationTypeLabel: string;
    accommodationTypeHotel: string;
    accommodationTypeHostedByFamilyOrFriend: string;
    accommodationTypeOwnProperty: string;
    accommodationTypeOther: string;
    payerTypeLabel: string;
    payerTypeSelf: string;
    payerTypeSponsor: string;
    payerTypeEmployer: string;
    payerNameLabel: string;
    payerRelationshipLabel: string;
    hostNameLabel: string;
    hostRelationshipLabel: string;
    hasPreviousTravelLabel: string;
    previousTravelNotesLabel: string;
    previousTravelNotesPlaceholder: string;
    continueToChecklistButton: string;

    // --- Dynamic document checklist (phase 2) ---
    checklistIntro: string;
    checklistStepLabel: string;
    requirementStatusRequired: string;
    requirementStatusOptional: string;
    requirementStatusIfApplicable: string;
    requirementAppliesToggleLabel: string;
    requirementWhyNeededPrefix: string;
    requirementAcceptedFormatsPrefix: string;
    requirementMaxSizePrefix: string;
    requirementUploadedFilenamePrefix: string;
    requirementValidationOk: string;
    requirementValidationPending: string;
    uploadButtonLabel: string;
    replaceFileLabel: string;
    backToQuestionnaireButton: string;
    missingRequiredDocuments: string;
    listSeparator: string;
    disclaimerVariesByCase: string;
    fallbackUnconfiguredDestinationNote: string;
    unrecognizedDocument: string;
    duplicateDocumentForRequirement: string;
    documentRejectedForRequirement: string;
    requirements: Record<
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
      | "OTHER_CASE_SPECIFIC",
      { label: string; why: string; instruction: string; acceptedFormatsNote: string }
    >;
  };
  contact: {
    getInTouch: string;
    title: string;
    intro: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    messagePlaceholder: string;
    sendButton: string;
    sending: string;
    successTitle: string;
    successBody: string;
    otherWays: string;
    regarding: string;
    genericError: string;
  };
  planTrip: {
    eyebrow: string;
    title: string;
    intro: string;
    destinationLabel: string;
    destinationPlaceholder: string;
    budgetLabel: string;
    periodLabel: string;
    periodPlaceholder: string;
    travelersLabel: string;
    styleLabel: string;
    styleLuxury: string;
    styleFamily: string;
    styleAdventure: string;
    styleHoneymoon: string;
    styleBudget: string;
    styleCultural: string;
    nameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    submitButton: string;
    sending: string;
    successTitle: string;
    successBody: string;
    genericError: string;
  };
  notFound: {
    eyebrow: string;
    title: string;
    body: string;
    browsePackages: string;
    backHome: string;
    contactDirectly: string;
  };
  errorBoundary: {
    eyebrow: string;
    title: string;
    body: string;
    tryAgain: string;
    backHome: string;
  };
  whatsappGreeting: string;
  whatsappChatLabel: string;
  languageSwitcher: {
    label: string;
  };
};

const ar: Dictionary = {
  nav: {
    home: "الرئيسية",
    packages: "الباقات",
    flights: "الرحلات الجوية",
    hotels: "الفنادق",
    destinations: "الوجهات",
    activities: "الأنشطة",
    visaAssistance: "مساعدة التأشيرة",
    contact: "اتصل بنا",
    planTrip: "خطط لرحلتك",
    explore: "استكشف",
    menuLabel: "القائمة",
    openMenu: "فتح قائمة التصفح",
    closeMenu: "إغلاق قائمة التصفح",
  },
  hero: {
    fallbackTagline: "وجهة تستحق الطيران إليها.",
    browsePackages: "تصفح الباقات",
    planWithUs: "خطط معنا",
    viewTrip: "شاهد هذه الرحلة",
    fromPrice: "ابتداءً من",
    perPerson: "للشخص الواحد",
    dayOne: "يوم",
    dayOther: "أيام",
    nightOne: "ليلة",
    nightOther: "ليالٍ",
    previousSlide: "الشريحة السابقة",
    nextSlide: "الشريحة التالية",
    goToSlide: "الانتقال إلى الشريحة {n}",
  },
  differentiators: [
    {
      title: "كل تفصيل يختاره فريقنا بيده",
      copy: "لا شيء هنا يأتي من نظام مخزون آلي. فريقنا يزور الوجهة ويتحقق من التفاصيل ويختار كل رحلة بنفسه قبل أن نعرضها عليكم.",
    },
    {
      title: "شخص حقيقي يؤكد حجزكم",
      copy: "قبل أي تأكيد نهائي، يتحقق أحد أعضاء فريقنا شخصيًا من التوفر والأسعار معكم.",
    },
    {
      title: "نفس الشخص، من أول رسالة حتى العودة",
      copy: "عبر البريد الإلكتروني أو الهاتف أو واتساب، تبقون على تواصل مع نفس الشخص طوال رحلتكم.",
    },
  ],
  howItWorks: {
    kicker: "كيف يعمل الأمر",
    title: "ثلاث خطوات، بلا تخمين",
    steps: [
      {
        title: "تصفح واختر",
        copy: "تصفحوا الباقات والفنادق والرحلات والأنشطة — أو ابدؤوا باختيار وجهة.",
      },
      {
        title: "أرسل طلبك",
        copy: "وجدتم ما يعجبكم؟ أرسلوا طلب حجز — دون أي دفع أو التزام في هذه المرحلة.",
      },
      {
        title: "نؤكد معكم",
        copy: "يتحقق فريقنا من التوفر والأسعار، ثم يتواصل معكم لتأكيد التفاصيل.",
      },
    ],
  },
  packages: {
    kicker: "من اختيارنا، لا من خوارزمية",
    featuredTitle: "الباقات المميزة",
    ourPackagesTitle: "باقاتنا",
    viewAll: "عرض الكل",
    empty: "لا توجد باقات منشورة بعد. تفضلوا بالعودة قريبًا.",
  },
  destinations: {
    kicker: "إلى أين التالي",
    title: "الوجهات الأكثر طلبًا",
  },
  storyBreak: {
    kicker: "نظرة أقرب",
    cta: "شاهد رحلات هذه الوجهة",
  },
  visaPromo: {
    kicker: "خدمة إضافية",
    title: "بحاجة إلى مساعدة في التأشيرة؟",
    body: "فريقنا يرافقكم في إجراءات التأشيرة لأي وجهة — سواء كان لديكم حجز معنا أم لا. أرسلوا طلبكم وسنتولى الباقي.",
    cta: "اطلب مساعدة في التأشيرة",
  },
  exploreMore: {
    title: "كل ما تحتاجونه لرحلتكم",
    subtitle: "رحلات وإقامات وأنشطة — كل ذلك في مكان واحد.",
    flights: "الرحلات الجوية",
    hotels: "الفنادق",
    activities: "الأنشطة",
    viewAll: "عرض الكل",
  },
  closingCta: {
    title: "رحلتكم القادمة تبدأ برسالة واحدة.",
    subtitle: "شاركونا فكرتكم، ونتولى نحن الباقي.",
    contactUs: "تواصل معنا",
  },
  footer: {
    followUs: "تابعونا",
    getInTouch: "تواصل معنا",
  },
  stats: {
    tripOne: "رحلة منتقاة",
    tripOther: "رحلات منتقاة",
    destinationOne: "وجهة",
    destinationOther: "وجهات",
    stayOne: "إقامة مختارة",
    stayOther: "إقامات مختارة",
  },
  testimonials: {
    kicker: "بكلماتهم",
    title: "ماذا يقول مسافرونا",
  },
  product: {
    from: "ابتداءً من",
    perPerson: "للشخص الواحد",
    perNight: "لليلة الواحدة",
    viewDetails: "عرض التفاصيل",
    requestToBook: "اطلب الحجز",
    noPaymentShort: "لا حاجة للدفع الآن — سنؤكد السعر النهائي معكم أولًا.",
    noPaymentLong: "أرسلوا طلب حجز — دون أي دفع — وسنؤكد التوفر والأسعار معكم مباشرة.",
    justHaveQuestion: "لديكم سؤال فقط؟",
    contactUsInstead: "تواصلوا معنا بدلًا من ذلك.",
    goodToKnow: "معلومات تهمكم",
    whatsIncludedTitle: "ما الذي يشمله السعر",
    included: "يشمل",
    notIncluded: "لا يشمل",
    tripHighlightsKicker: "أبرز محطات الرحلة",
    whatMakesSpecial: "ما الذي يجعل هذه الرحلة مميزة",
    whatToBringTitle: "ماذا تحضرون معكم",
    importantNotesTitle: "ملاحظات مهمة",
    meetingPointTitle: "نقطة اللقاء",
    cancellationPolicyTitle: "سياسة الإلغاء",
    comfortsExtrasKicker: "وسائل الراحة والإضافات",
    amenitiesTitle: "المرافق والخدمات",
    whereYoullStayKicker: "أين ستقيمون",
    roomOptionsTitle: "خيارات الغرف",
    sleeps: "يتسع لـ",
    bedOne: "سرير",
    bedOther: "أسرّة",
    departure: "المغادرة",
    arrival: "الوصول",
    direct: "مباشرة",
    stopOne: "توقف واحد",
    stopOther: "توقفات",
    backToPackages: "الباقات",
    backToHotels: "الفنادق",
    backToFlights: "الرحلات الجوية",
    backToActivities: "الأنشطة",
    backToDestinations: "الوجهات",
    readyToBook: "هل أنتم مستعدون لحجز",
    wantToStay: "هل ترغبون بالإقامة في",
    interestedInFlight: "مهتمون بهذه الرحلة الجوية؟",
    interestedIn: "مهتمون بـ",
    wantToVisit: "هل ترغبون بزيارة",
    tripsTo: "رحلات إلى",
    readyMadeKicker: "باقات جاهزة",
    notToMissKicker: "لا يفوّتكم",
    popularAttractionsTitle: "أبرز المعالم",
    minuteOne: "دقيقة",
    minuteOther: "دقائق",
    itineraryKicker: "برنامج الرحلة",
    itineraryTitle: "برنامج الرحلة يومًا بيوم",
    dayLabel: "اليوم",
    mealBreakfastLabel: "الإفطار",
    mealLunchLabel: "الغداء",
    mealDinnerLabel: "العشاء",
    yourGuideTitle: "دليلكم السياحي",
    hourOne: "ساعة",
    hourOther: "ساعات",
    hourAbbr: "س",
    minuteAbbr: "د",
  },
  listing: {
    packages: {
      title: "الباقات",
      description: "رحلة كاملة بسعر واحد: إقامة، تنقلات، وأنشطة مجمّعة في برنامج جاهز — الخيار الأنسب إن كنتم تريدون كل شيء منظمًا مسبقًا.",
      kickerOne: "رحلة جاهزة للحجز",
      kickerOther: "رحلات جاهزة للحجز",
      searchPlaceholder: "ابحث عن وجهة أو باقة…",
      emptyDefault: "لا توجد باقات منشورة بعد. تفضلوا بالعودة قريبًا.",
      emptySearch: "لا توجد باقات مطابقة لبحثكم.",
      featuredTrip: "رحلة مميزة",
      viewPackage: "شاهد الباقة",
    },
    hotels: {
      title: "الفنادق",
      description: "احجزوا إقامة فندقية فقط، دون باقة كاملة — مثالي إن كنتم تنظمون باقي رحلتكم بأنفسكم.",
      kickerOne: "إقامة جاهزة للحجز",
      kickerOther: "إقامات جاهزة للحجز",
      searchPlaceholder: "ابحث عن فندق أو مدينة…",
      emptyDefault: "لا توجد فنادق منشورة بعد. تفضلوا بالعودة قريبًا.",
      emptySearch: "لا توجد فنادق مطابقة لبحثكم.",
    },
    flights: {
      title: "الرحلات الجوية",
      description: "احجزوا تذكرة الطيران فقط، دون فندق أو برنامج مرفق — مناسب لمن يتكفل بترتيب إقامته بنفسه.",
      kickerOne: "خط رحلة متاح",
      kickerOther: "خطوط رحلات متاحة",
      searchPlaceholder: "ابحث عن خط رحلة أو شركة طيران أو مدينة…",
      emptyDefault: "لا توجد رحلات منشورة بعد. تفضلوا بالعودة قريبًا.",
      emptySearch: "لا توجد رحلات مطابقة لبحثكم.",
    },
    destinations: {
      title: "الوجهات",
      description: "لا تُحجز مباشرة — دليل مصوّر لكل وجهة يساعدكم على الاختيار، ثم يوجهكم إلى الباقات والفنادق والرحلات المتاحة فيها.",
      kickerOne: "وجهة يمكنكم زيارتها",
      kickerOther: "وجهات يمكنكم زيارتها",
      searchPlaceholder: "ابحث عن وجهة…",
      emptyDefault: "لا توجد وجهات منشورة بعد. تفضلوا بالعودة قريبًا.",
      emptySearch: "لا توجد وجهات مطابقة لبحثكم.",
    },
    activities: {
      title: "الأنشطة",
      description: "تجربة أو جولة واحدة لبضع ساعات — يمكن إضافتها بمفردها أو جنبًا إلى جنب مع أي باقة أو حجز آخر.",
      kickerOne: "تجربة جاهزة للحجز",
      kickerOther: "تجارب جاهزة للحجز",
      searchPlaceholder: "ابحث عن نشاط…",
      emptyDefault: "لا توجد أنشطة منشورة بعد. تفضلوا بالعودة قريبًا.",
      emptySearch: "لا توجد أنشطة مطابقة لبحثكم.",
    },
  },
  booking: {
    almostThere: "خطوة أخيرة",
    title: "اطلب الحجز",
    intro: "أخبرونا بتفاصيل رحلتكم وسنؤكد التوفر والأسعار معكم مباشرة — دون أي دفع لإرسال الطلب.",
    preferGeneral: "تفضلون طرح سؤال عام بدلًا من ذلك؟",
    contactLink: "تواصلوا معنا",
    kindLabels: {
      package: "باقة",
      hotel: "فندق",
      destination: "وجهة",
      activity: "نشاط",
      flight: "رحلة جوية",
    },
    requesting: "الطلب يخص:",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    optionalTag: "(اختياري)",
    whatsapp: "واتساب",
    adults: "البالغون",
    children: "الأطفال",
    preferredDate: "تاريخ السفر المفضّل",
    returnDate: "تاريخ العودة",
    notes: "ملاحظات",
    notesPlaceholder: "أي شيء آخر تودّون إخبارنا به؟",
    noPaymentFormNote:
      "لا حاجة للدفع — هذا طلب فقط. سنؤكد التوفر والسعر النهائي معكم قبل إتمام أي حجز.",
    sendButton: "إرسال طلب الحجز",
    sending: "جارٍ الإرسال…",
    successTitle: "تم إرسال طلب الحجز!",
    successBody: "استلمنا طلبكم وسنتواصل معكم قريبًا لتأكيد التفاصيل.",
    referenceLabel: "رقم مرجع طلبكم:",
    responseGeneric: "عادةً ما نرد خلال يوم أو يومين.",
    responseWithHours: "عادةً ما نرد خلال ساعات عملنا:",
    whatsappFaster: "تريدون ردًا أسرع؟ راسلونا عبر واتساب ←",
    genericError: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    listingUnavailable: "لم يعد هذا العرض متاحًا. يرجى تصفح باقاتنا الحالية أو التواصل معنا مباشرة.",
    backToItem: "الرجوع إلى {name}",
    browseMore: "تصفح المزيد من العروض",
  },
  visaAssistance: {
    eyebrow: "خدمة مساعدة التأشيرة",
    title: "اطلب مساعدة في التأشيرة",
    intro:
      "أخبرونا بوجهتكم وتفاصيل سفركم، وسيتولى فريقنا مرافقتكم في إجراءات التأشيرة — سواء كان لديكم حجز معنا أم لا.",
    selectPlaceholder: "اختر…",
    destinationLabel: "بلد الوجهة",
    nationalityLabel: "الجنسية",
    visaTypeLabel: "نوع التأشيرة",
    visaTypeTourist: "سياحية",
    visaTypeBusiness: "أعمال",
    visaTypeTransit: "عبور",
    visaTypeStudent: "دراسية",
    visaTypeWork: "عمل",
    visaTypeFamilyVisit: "زيارة عائلية",
    visaTypeMedical: "علاجية",
    visaTypeOther: "أخرى",
    travelerCountLabel: "عدد المسافرين",
    travelStartDate: "تاريخ بداية السفر",
    travelEndDate: "تاريخ نهاية السفر",
    optionalTag: "(اختياري)",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    phonePlaceholder: "مثال: +213 555 00 01 11",
    invalidPhone: "يرجى إدخال رقم هاتف صحيح، مع رمز البلد إن كان مختلفًا عن جنسيتكم.",
    whatsapp: "واتساب",
    bookingReferenceLabel: "رقم مرجع الحجز",
    bookingReferencePlaceholder: "إن كان لديكم حجز معنا بالفعل",
    travelersSectionTitle: "بيانات المسافرين",
    travellerNumberLabel: "المسافر {n}",
    travellerFirstName: "الاسم الأول",
    travellerLastName: "اسم العائلة",
    dateOfBirth: "تاريخ الميلاد",
    travellerNationality: "الجنسية",
    passportNumber: "رقم جواز السفر",
    passportIssuingCountry: "بلد إصدار الجواز",
    passportIssueDate: "تاريخ إصدار الجواز",
    passportExpiry: "تاريخ انتهاء الجواز",
    removeFile: "إزالة الملف",
    checkingFiles: "جارٍ التحقق من جودة الملفات…",
    pdfQualityNotChecked: "لا يمكن التحقق التلقائي من جودة ملفات PDF — يرجى التأكد من وضوح المستند واكتماله.",
    qualityLowResolution: "دقة الصورة منخفضة جدًا. يرجى رفع صورة أو مسح ضوئي بدقة أعلى.",
    qualityTooDark: "الصورة داكنة جدًا. يرجى التقاط صورة في إضاءة أفضل.",
    qualityTooBright: "الصورة مضيئة جدًا/باهتة. يرجى إعادة التصوير بإضاءة معتدلة.",
    qualityTooBlurry: "الصورة غير واضحة (مموّهة). يرجى رفع صورة أوضح.",
    qualityGlare: "تم رصد وهج أو انعكاس ضوئي على المستند. يرجى إعادة التصوير بدون انعكاس.",
    qualityCropped: "يبدو أن جزءًا من المستند مقصوص. يرجى رفع الصفحة كاملة.",
    qualityUnreadable: "تعذّرت قراءة الصورة. يرجى التأكد من صحة الملف وإعادة المحاولة.",
    notesLabel: "ملاحظات",
    notesPlaceholder: "أي تفاصيل إضافية تودّون إخبارنا بها؟",
    sendButton: "إرسال طلب التأشيرة",
    sending: "جارٍ الإرسال…",
    successTitle: "تم إرسال طلب التأشيرة!",
    successBody: "استلمنا طلبكم وسيتواصل معكم فريقنا قريبًا لمتابعة الإجراءات.",
    referenceLabel: "رقم مرجع طلبكم:",
    responseGeneric: "عادةً ما نرد خلال يوم أو يومين.",
    responseWithHours: "عادةً ما نرد خلال ساعات عملنا:",
    whatsappFaster: "تريدون ردًا أسرع؟ راسلونا عبر واتساب ←",
    genericError: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    rateLimited: "تم إرسال عدة طلبات مؤخرًا. يرجى المحاولة لاحقًا أو التواصل معنا مباشرة.",
    tooManyFiles: "تم تجاوز الحد الأقصى لعدد الملفات المرفقة.",
    unsupportedFileType: "نوع الملف غير مدعوم. المسموح به: PDF أو صور (JPG، PNG، WEBP، GIF).",
    fileTooLarge: "حجم الملف يجب ألا يتجاوز 4 ميغابايت.",

    caseDetailsSectionTitle: "تفاصيل حالة التأشيرة",
    countryOfResidenceLabel: "بلد الإقامة",
    employmentStatusLabel: "الوضع المهني",
    employmentStatusEmployed: "موظَّف",
    employmentStatusSelfEmployed: "صاحب عمل حر",
    employmentStatusStudent: "طالب",
    employmentStatusRetired: "متقاعد",
    employmentStatusUnemployed: "غير موظَّف",
    employmentStatusOther: "أخرى",
    accommodationTypeLabel: "نوع الإقامة أثناء السفر",
    accommodationTypeHotel: "فندق",
    accommodationTypeHostedByFamilyOrFriend: "الإقامة عند عائلة أو صديق",
    accommodationTypeOwnProperty: "ملكية خاصة",
    accommodationTypeOther: "أخرى",
    payerTypeLabel: "مَن يتحمّل تكاليف الرحلة؟",
    payerTypeSelf: "المسافر نفسه",
    payerTypeSponsor: "كفيل / ممول",
    payerTypeEmployer: "جهة العمل",
    payerNameLabel: "اسم الكفيل/الممول",
    payerRelationshipLabel: "صلة القرابة بالكفيل/الممول",
    hostNameLabel: "اسم المضيف/الداعي",
    hostRelationshipLabel: "صلة القرابة بالمضيف/الداعي",
    hasPreviousTravelLabel: "هل سبق للمسافر السفر دوليًا أو الحصول على تأشيرة سابقة؟",
    previousTravelNotesLabel: "تفاصيل السفر أو التأشيرات السابقة",
    previousTravelNotesPlaceholder: "مثال: تأشيرة شنغن في 2024، أو رحلة سابقة إلى تركيا في 2023…",
    continueToChecklistButton: "متابعة إلى قائمة المستندات",

    checklistIntro:
      "بناءً على إجاباتكم، أعددنا قائمة المستندات المطلوبة لحالتكم. يرجى رفع كل مستند في الخطوة المخصصة له.",
    checklistStepLabel: "الخطوة {n} — {name}",
    requirementStatusRequired: "مطلوب",
    requirementStatusOptional: "اختياري",
    requirementStatusIfApplicable: "إن كان ينطبق عليكم",
    requirementAppliesToggleLabel: "هل ينطبق هذا عليكم؟",
    requirementWhyNeededPrefix: "لماذا نطلبه:",
    requirementAcceptedFormatsPrefix: "الصيغ المقبولة:",
    requirementMaxSizePrefix: "الحجم الأقصى:",
    requirementUploadedFilenamePrefix: "الملف المرفوع:",
    requirementValidationOk: "تم التحقق التقني ✓",
    requirementValidationPending: "بانتظار الرفع",
    uploadButtonLabel: "رفع الملف",
    replaceFileLabel: "استبدال الملف",
    backToQuestionnaireButton: "الرجوع إلى الأسئلة",
    missingRequiredDocuments: "يرجى إرفاق المستندات المطلوبة التالية قبل الإرسال: {documents}",
    listSeparator: "، ",
    disclaimerVariesByCase:
      "تختلف المستندات المطلوبة حسب الوجهة والجنسية ونوع التأشيرة والظروف الفردية. هذه القائمة دليل تحضيري أولي فقط، وقد تطلب القنصلية أو السفارة أو مركز طلبات التأشيرة مستندات إضافية.",
    fallbackUnconfiguredDestinationNote:
      "لم نُعِدّ بعد قائمة مستندات مخصصة لهذه الوجهة. سيقوم فريقنا بمراجعة حالتكم وتأكيد المستندات المطلوبة بعد استلام طلبكم.",
    unrecognizedDocument: "أحد الملفات المرسلة لا يتوافق مع قائمة المستندات المحددة لحالتكم.",
    duplicateDocumentForRequirement: "تم إرفاق أكثر من ملف لنفس المستند المطلوب.",
    documentRejectedForRequirement: "{name} — {reason}",

    requirements: {
      PASSPORT_BIO_PAGE: {
        label: "جواز السفر — صفحة البيانات الشخصية",
        why: "لإثبات الهوية والتحقق من صلاحية وثيقة السفر.",
        instruction: "صوّروا أو امسحوا ضوئيًا الصفحة التي تحمل صورتكم وبياناتكم الشخصية، بشكل واضح وكامل.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      NATIONAL_ID: {
        label: "بطاقة التعريف الوطنية (إن وُجدت)",
        why: "وثيقة هوية إضافية قد تُطلب لدعم الملف.",
        instruction: "أرفقوا وجهي البطاقة إن كانت متوفرة لديكم.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      VISA_PHOTO: {
        label: "صورة شخصية حديثة لطلب التأشيرة",
        why: "مواصفات صورة التأشيرة تختلف حسب الوجهة — نطلبها بشكل منفصل عن أي مستند آخر.",
        instruction: "صورة حديثة (أقل من 6 أشهر)، بخلفية فاتحة موحدة، بدون نظارات أو غطاء رأس (إلا لأسباب دينية).",
        acceptedFormatsNote: "صورة فقط",
      },
      PROOF_OF_ACCOMMODATION: {
        label: "إثبات مكان الإقامة",
        why: "لإثبات وجود مكان إقامة مؤكد طوال مدة الرحلة.",
        instruction: "أي مستند رسمي يثبت مكان إقامتكم أثناء الرحلة.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      HOTEL_RESERVATION: {
        label: "حجز الفندق",
        why: "إثبات حجز فعلي أو مؤقت في الفندق المذكور.",
        instruction: "تأكيد الحجز الصادر من الفندق أو منصة الحجز، يتضمن التواريخ والاسم الكامل.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      INVITATION_LETTER: {
        label: "رسالة دعوة من المضيف",
        why: "لإثبات أن شخصًا في بلد الوجهة يستضيفكم أو يدعوكم.",
        instruction: "رسالة موقّعة من المضيف تتضمن بياناته وعنوانه ومدة الإقامة المقترحة.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      PROOF_OF_RELATIONSHIP_TO_HOST: {
        label: "إثبات صلة القرابة أو العلاقة بالمضيف",
        why: "لتوضيح طبيعة العلاقة بينكم وبين الشخص الذي تقيمون عنده.",
        instruction: "أي مستند يوضّح العلاقة (شهادة قرابة، صور مشتركة، مراسلات سابقة...).",
        acceptedFormatsNote: "PDF أو صورة",
      },
      BANK_STATEMENTS: {
        label: "كشف حساب بنكي",
        why: "لإثبات القدرة المالية على تغطية تكاليف الرحلة.",
        instruction: "كشف حساب حديث يغطي آخر 3 أشهر، صادر من البنك ويحمل اسمكم الكامل.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      PAYSLIPS: {
        label: "كشوف الرواتب",
        why: "لإثبات الدخل الشهري المنتظم.",
        instruction: "آخر 3 كشوف رواتب صادرة من جهة العمل.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      EMPLOYMENT_CERTIFICATE: {
        label: "شهادة عمل",
        why: "لإثبات الوضع المهني الحالي والارتباط الوظيفي في بلد الإقامة.",
        instruction: "شهادة عمل حديثة صادرة من جهة العمل تتضمن المنصب وتاريخ التوظيف.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      LEAVE_AUTHORIZATION: {
        label: "رخصة تغيّب / عطلة من العمل",
        why: "لإثبات الحصول على إذن بالسفر خلال فترة العمل.",
        instruction: "مستند صادر من جهة العمل يوضّح فترة العطلة الممنوحة.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      BUSINESS_REGISTRATION: {
        label: "السجل التجاري / وثيقة تسجيل النشاط",
        why: "لإثبات النشاط المهني الحر أو ملكية المشروع.",
        instruction: "نسخة من السجل التجاري أو ما يثبت تسجيل النشاط.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      STUDENT_CERTIFICATE: {
        label: "شهادة تمدرس / إثبات التسجيل الجامعي",
        why: "لإثبات الوضع الطلابي الحالي.",
        instruction: "شهادة تمدرس حديثة صادرة من المؤسسة التعليمية.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      PROPERTY_ASSET_EVIDENCE: {
        label: "إثبات ملكية عقار أو ممتلكات",
        why: "لإثبات الروابط والاستقرار في بلد الإقامة.",
        instruction: "عقد ملكية أو أي وثيقة رسمية مماثلة.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      TRAVEL_ITINERARY: {
        label: "برنامج الرحلة",
        why: "لتوضيح خطة السفر والتنقلات المزمعة.",
        instruction: "وصف مبسّط لبرنامج الإقامة والتنقلات، يوم بيوم إن أمكن.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      RETURN_FLIGHT_RESERVATION: {
        label: "حجز رحلة العودة",
        why: "لإثبات نية مغادرة بلد الوجهة في التاريخ المحدد.",
        instruction: "تأكيد حجز الرحلة (ذهاب وإياب) الصادر من شركة الطيران أو وكالة السفر.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      TRAVEL_MEDICAL_INSURANCE: {
        label: "التأمين الصحي للسفر",
        why: "لتغطية النفقات الطبية والاستشفاء المحتملة أثناء الرحلة.",
        instruction:
          "وثيقة تأمين صالحة لكامل مدة الرحلة ولبلد الوجهة. ملاحظة: دول منطقة شنغن تشترط قانونًا تغطية بحد أدنى 30,000 يورو — تختلف الشروط في وجهات أخرى.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      PREVIOUS_VISAS: {
        label: "تأشيرات سابقة",
        why: "يساعد في تقييم السجل السفري السابق.",
        instruction: "صور للتأشيرات السابقة إن وُجدت.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      PREVIOUS_PASSPORTS: {
        label: "جوازات سفر سابقة",
        why: "يساعد في تقييم السجل السفري السابق.",
        instruction: "صور لصفحات البيانات في جوازات السفر المنتهية سابقًا.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      SPONSOR_FINANCIAL_DOCUMENTS: {
        label: "المستندات المالية للكفيل/الممول",
        why: "لإثبات القدرة المالية للشخص الذي يمول الرحلة.",
        instruction: "كشف حساب بنكي أو ما يثبت الدخل الخاص بالكفيل.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      SPONSOR_IDENTITY_DOCUMENTS: {
        label: "مستندات هوية الكفيل/الممول",
        why: "لإثبات هوية الشخص الذي يمول الرحلة.",
        instruction: "نسخة من بطاقة التعريف أو جواز سفر الكفيل.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      CIVIL_STATUS_DOCUMENTS: {
        label: "مستندات الحالة المدنية",
        why: "لإثبات صلة القرابة (مثل الزواج أو الميلاد) عند الاقتضاء.",
        instruction: "عقد الزواج أو شهادة الميلاد حسب ما ينطبق على حالتكم.",
        acceptedFormatsNote: "PDF أو صورة",
      },
      OTHER_CASE_SPECIFIC: {
        label: "مستندات إضافية خاصة بحالتكم",
        why: "لأي مستند تعتقدون أنه قد يدعم ملفكم ولم يُذكر أعلاه.",
        instruction: "اختياري — أرفقوا أي مستند إضافي ترونه مفيدًا.",
        acceptedFormatsNote: "PDF أو صورة",
      },
    },
  },
  contact: {
    getInTouch: "تواصلوا معنا",
    title: "اتصل بنا",
    intro: "لديكم سؤال أو تودّون التخطيط لرحلتكم القادمة؟ أرسلوا لنا رسالة.",
    name: "الاسم",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    message: "الرسالة",
    messagePlaceholder: "أخبرونا عمّا تبحثون عنه…",
    sendButton: "إرسال الرسالة",
    sending: "جارٍ الإرسال…",
    successTitle: "شكرًا لتواصلكم معنا!",
    successBody: "استلمنا رسالتكم وسنرد عليكم قريبًا.",
    otherWays: "طرق أخرى للتواصل معنا",
    regarding: "بخصوص:",
    genericError: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  },
  planTrip: {
    eyebrow: "خطط لرحلتك",
    title: "أخبرونا عن رحلة أحلامكم",
    intro: "لم تختاروا باقة بعد؟ أجيبوا عن بضعة أسئلة بسيطة وسنقترح عليكم الأنسب لكم شخصيًا.",
    destinationLabel: "الوجهة المفضّلة",
    destinationPlaceholder: "مثال: تركيا، دبي، أو لم أقرر بعد",
    budgetLabel: "الميزانية التقريبية (دولار أمريكي)",
    periodLabel: "فترة السفر",
    periodPlaceholder: "مثال: صيف 2027، أو خلال شهرين",
    travelersLabel: "عدد المسافرين",
    styleLabel: "أسلوب الرحلة",
    styleLuxury: "فاخرة",
    styleFamily: "عائلية",
    styleAdventure: "مغامرة",
    styleHoneymoon: "شهر عسل",
    styleBudget: "اقتصادية",
    styleCultural: "ثقافية",
    nameLabel: "الاسم الكامل",
    emailLabel: "البريد الإلكتروني",
    phoneLabel: "الهاتف",
    submitButton: "أرسل طلبي",
    sending: "جارٍ الإرسال…",
    successTitle: "شكرًا لكم!",
    successBody: "استلمنا تفاصيل رحلتكم وسيتواصل معكم فريقنا قريبًا باقتراحات مناسبة لكم.",
    genericError: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  },
  notFound: {
    eyebrow: "الصفحة غير موجودة",
    title: "يبدو أن هذه الرحلة سلكت طريقًا مختلفًا.",
    body: "الصفحة التي تبحثون عنها غير موجودة أو رُبما تغيّر مكانها — لكن هناك رحلات حقيقية بانتظار حجزها.",
    browsePackages: "تصفح الباقات",
    backHome: "العودة للرئيسية",
    contactDirectly: "أو تواصلوا معنا مباشرة",
  },
  errorBoundary: {
    eyebrow: "حدث خطأ ما",
    title: "واجهنا مشكلة في تحميل هذه الصفحة.",
    body: "الأمر لا يتعلق بكم — يرجى المحاولة مرة أخرى، أو العودة لمتابعة ما كنتم تفعلونه.",
    tryAgain: "حاول مرة أخرى",
    backHome: "العودة للرئيسية",
  },
  whatsappGreeting: "مرحبًا {agency}، لديّ سؤال بخصوص إحدى الرحلات.",
  whatsappChatLabel: "تواصل معنا عبر واتساب",
  languageSwitcher: {
    label: "اللغة",
  },
};

const fr: Dictionary = {
  nav: {
    home: "Accueil",
    packages: "Forfaits",
    flights: "Vols",
    hotels: "Hôtels",
    destinations: "Destinations",
    activities: "Activités",
    visaAssistance: "Assistance visa",
    contact: "Contact",
    planTrip: "Planifier un voyage",
    explore: "Explorer",
    menuLabel: "Menu",
    openMenu: "Ouvrir le menu de navigation",
    closeMenu: "Fermer le menu de navigation",
  },
  hero: {
    fallbackTagline: "Une destination qui mérite le voyage.",
    browsePackages: "Découvrir les forfaits",
    planWithUs: "Planifiez avec nous",
    viewTrip: "Découvrir ce voyage",
    fromPrice: "à partir de",
    perPerson: "par personne",
    dayOne: "jour",
    dayOther: "jours",
    nightOne: "nuit",
    nightOther: "nuits",
    previousSlide: "Diapositive précédente",
    nextSlide: "Diapositive suivante",
    goToSlide: "Aller à la diapositive {n}",
  },
  differentiators: [
    {
      title: "Chaque détail, choisi à la main",
      copy: "Aucune offre ici ne sort d'un flux automatisé. Notre équipe visite, vérifie et sélectionne chaque voyage avant de vous le proposer.",
    },
    {
      title: "Une vraie personne confirme votre réservation",
      copy: "Avant toute confirmation, un membre de notre équipe vérifie personnellement la disponibilité et les tarifs avec vous.",
    },
    {
      title: "Le même interlocuteur, du premier message au retour",
      copy: "Par e-mail, téléphone ou WhatsApp, vous gardez le même contact tout au long de votre voyage.",
    },
  ],
  howItWorks: {
    kicker: "Comment ça marche",
    title: "Trois étapes, sans surprise",
    steps: [
      {
        title: "Parcourez et choisissez",
        copy: "Parcourez nos forfaits, hôtels, vols et activités — ou commencez par une destination.",
      },
      {
        title: "Envoyez une demande",
        copy: "Vous avez trouvé ce qui vous plaît ? Envoyez une demande de réservation — sans paiement ni engagement pour l'instant.",
      },
      {
        title: "Nous confirmons avec vous",
        copy: "Notre équipe vérifie la disponibilité et les tarifs, puis vous contacte pour confirmer les détails.",
      },
    ],
  },
  packages: {
    kicker: "Sélectionné par nous, pas par un algorithme",
    featuredTitle: "Forfaits en vedette",
    ourPackagesTitle: "Nos forfaits",
    viewAll: "Voir tout",
    empty: "Aucun forfait publié pour le moment. Revenez bientôt.",
  },
  destinations: {
    kicker: "Votre prochaine étape",
    title: "Destinations populaires",
  },
  storyBreak: {
    kicker: "Zoom sur",
    cta: "Voir les voyages là-bas",
  },
  visaPromo: {
    kicker: "Service complémentaire",
    title: "Besoin d'aide pour votre visa ?",
    body: "Notre équipe vous accompagne dans vos démarches de visa pour n'importe quelle destination — que vous ayez une réservation avec nous ou non. Envoyez votre demande, on s'occupe du reste.",
    cta: "Demander une assistance visa",
  },
  exploreMore: {
    title: "Tout pour votre voyage",
    subtitle: "Vols, séjours et activités — tout au même endroit.",
    flights: "Vols",
    hotels: "Hôtels",
    activities: "Activités",
    viewAll: "Voir tout",
  },
  closingCta: {
    title: "Votre prochain voyage commence par un message.",
    subtitle: "Parlez-nous de votre projet — nous nous occupons de tout le reste.",
    contactUs: "Nous contacter",
  },
  footer: {
    followUs: "Suivez-nous",
    getInTouch: "Nous contacter",
  },
  stats: {
    tripOne: "voyage sélectionné",
    tripOther: "voyages sélectionnés",
    destinationOne: "destination",
    destinationOther: "destinations",
    stayOne: "séjour sélectionné",
    stayOther: "séjours sélectionnés",
  },
  testimonials: {
    kicker: "Dans leurs mots",
    title: "Ce que disent nos voyageurs",
  },
  product: {
    from: "à partir de",
    perPerson: "par personne",
    perNight: "par nuit",
    viewDetails: "Voir les détails",
    requestToBook: "Demander à réserver",
    noPaymentShort: "Aucun paiement requis maintenant — nous confirmerons le tarif final avec vous.",
    noPaymentLong:
      "Envoyez une demande de réservation — sans paiement — et nous confirmerons la disponibilité et les tarifs directement avec vous.",
    justHaveQuestion: "Juste une question ?",
    contactUsInstead: "Contactez-nous plutôt.",
    goodToKnow: "Bon à savoir",
    whatsIncludedTitle: "Ce qui est inclus",
    included: "Inclus",
    notIncluded: "Non inclus",
    tripHighlightsKicker: "Points forts du voyage",
    whatMakesSpecial: "Ce qui rend ce voyage unique",
    whatToBringTitle: "Quoi emporter",
    importantNotesTitle: "Notes importantes",
    meetingPointTitle: "Point de rendez-vous",
    cancellationPolicyTitle: "Politique d'annulation",
    comfortsExtrasKicker: "Conforts et extras",
    amenitiesTitle: "Équipements",
    whereYoullStayKicker: "Où vous séjournerez",
    roomOptionsTitle: "Types de chambres",
    sleeps: "Capacité",
    bedOne: "lit",
    bedOther: "lits",
    departure: "Départ",
    arrival: "Arrivée",
    direct: "Direct",
    stopOne: "escale",
    stopOther: "escales",
    backToPackages: "Forfaits",
    backToHotels: "Hôtels",
    backToFlights: "Vols",
    backToActivities: "Activités",
    backToDestinations: "Destinations",
    readyToBook: "Prêt à réserver",
    wantToStay: "Envie de séjourner à",
    interestedInFlight: "Intéressé par ce vol ?",
    interestedIn: "Intéressé par",
    wantToVisit: "Envie de visiter",
    tripsTo: "Voyages vers",
    readyMadeKicker: "Forfaits prêts à réserver",
    notToMissKicker: "À ne pas manquer",
    popularAttractionsTitle: "Attractions incontournables",
    minuteOne: "minute",
    minuteOther: "minutes",
    itineraryKicker: "Programme du voyage",
    itineraryTitle: "Programme jour par jour",
    dayLabel: "Jour",
    mealBreakfastLabel: "Petit-déjeuner",
    mealLunchLabel: "Déjeuner",
    mealDinnerLabel: "Dîner",
    yourGuideTitle: "Votre guide",
    hourOne: "heure",
    hourOther: "heures",
    hourAbbr: "h",
    minuteAbbr: "min",
  },
  listing: {
    packages: {
      title: "Forfaits",
      description: "Un voyage complet à prix unique : hébergement, transport et activités regroupés dans un programme prêt à l'emploi — l'option idéale si vous voulez tout organisé à l'avance.",
      kickerOne: "voyage prêt à réserver",
      kickerOther: "voyages prêts à réserver",
      searchPlaceholder: "Rechercher une destination, un forfait…",
      emptyDefault: "Aucun forfait publié pour le moment. Revenez bientôt.",
      emptySearch: "Aucun forfait ne correspond à votre recherche.",
      featuredTrip: "Voyage en vedette",
      viewPackage: "Voir le forfait",
    },
    hotels: {
      title: "Hôtels",
      description: "Réservez uniquement l'hébergement, sans forfait complet — idéal si vous organisez vous-même le reste de votre voyage.",
      kickerOne: "séjour prêt à réserver",
      kickerOther: "séjours prêts à réserver",
      searchPlaceholder: "Rechercher un hôtel, une ville…",
      emptyDefault: "Aucun hôtel publié pour le moment. Revenez bientôt.",
      emptySearch: "Aucun hôtel ne correspond à votre recherche.",
    },
    flights: {
      title: "Vols",
      description: "Réservez uniquement le billet d'avion, sans hôtel ni programme associé — pour ceux qui organisent leur hébergement de leur côté.",
      kickerOne: "itinéraire disponible",
      kickerOther: "itinéraires disponibles",
      searchPlaceholder: "Rechercher un itinéraire, une compagnie, une ville…",
      emptyDefault: "Aucun vol publié pour le moment. Revenez bientôt.",
      emptySearch: "Aucun vol ne correspond à votre recherche.",
    },
    destinations: {
      title: "Destinations",
      description: "Non réservable directement — un guide illustré de chaque destination pour vous aider à choisir, puis vous orienter vers les forfaits, hôtels et vols disponibles sur place.",
      kickerOne: "destination à découvrir",
      kickerOther: "destinations à découvrir",
      searchPlaceholder: "Rechercher une destination…",
      emptyDefault: "Aucune destination publiée pour le moment. Revenez bientôt.",
      emptySearch: "Aucune destination ne correspond à votre recherche.",
    },
    activities: {
      title: "Activités",
      description: "Une expérience ou une excursion de quelques heures — à ajouter seule ou en complément d'un forfait ou d'une autre réservation.",
      kickerOne: "expérience prête à réserver",
      kickerOther: "expériences prêtes à réserver",
      searchPlaceholder: "Rechercher une activité…",
      emptyDefault: "Aucune activité publiée pour le moment. Revenez bientôt.",
      emptySearch: "Aucune activité ne correspond à votre recherche.",
    },
  },
  booking: {
    almostThere: "Presque terminé",
    title: "Demander à réserver",
    intro: "Indiquez-nous les détails de votre voyage et nous confirmerons la disponibilité et les tarifs directement avec vous — aucun paiement requis pour envoyer une demande.",
    preferGeneral: "Vous préférez poser une question générale ?",
    contactLink: "Contactez-nous",
    kindLabels: {
      package: "Forfait",
      hotel: "Hôtel",
      destination: "Destination",
      activity: "Activité",
      flight: "Vol",
    },
    requesting: "Demande concernant :",
    fullName: "Nom complet",
    email: "E-mail",
    phone: "Téléphone",
    optionalTag: "(facultatif)",
    whatsapp: "WhatsApp",
    adults: "Adultes",
    children: "Enfants",
    preferredDate: "Date de départ souhaitée",
    returnDate: "Date de retour",
    notes: "Notes",
    notesPlaceholder: "Autre chose à nous signaler ?",
    noPaymentFormNote:
      "Aucun paiement requis — ceci est une simple demande. Nous confirmerons la disponibilité et le tarif final avec vous avant toute réservation.",
    sendButton: "Envoyer la demande de réservation",
    sending: "Envoi en cours…",
    successTitle: "Demande de réservation envoyée !",
    successBody: "Nous avons bien reçu votre demande et vous recontacterons bientôt pour confirmer les détails.",
    referenceLabel: "Votre référence :",
    responseGeneric: "Nous répondons généralement sous un jour ou deux.",
    responseWithHours: "Nous répondons généralement pendant nos horaires :",
    whatsappFaster: "Vous voulez une réponse plus rapide ? Écrivez-nous sur WhatsApp →",
    genericError: "Une erreur s'est produite. Veuillez réessayer.",
    listingUnavailable: "Cette offre n'est plus disponible. Découvrez nos forfaits actuels ou contactez-nous directement.",
    backToItem: "Retour à {name}",
    browseMore: "Découvrir plus d'offres",
  },
  visaAssistance: {
    eyebrow: "Service d'assistance visa",
    title: "Demander une assistance visa",
    intro:
      "Indiquez-nous votre destination et les détails de votre voyage — notre équipe vous accompagne dans vos démarches de visa, que vous ayez une réservation avec nous ou non.",
    selectPlaceholder: "Sélectionner…",
    destinationLabel: "Pays de destination",
    nationalityLabel: "Nationalité",
    visaTypeLabel: "Type de visa",
    visaTypeTourist: "Tourisme",
    visaTypeBusiness: "Affaires",
    visaTypeTransit: "Transit",
    visaTypeStudent: "Étudiant",
    visaTypeWork: "Travail",
    visaTypeFamilyVisit: "Visite familiale",
    visaTypeMedical: "Médical",
    visaTypeOther: "Autre",
    travelerCountLabel: "Nombre de voyageurs",
    travelStartDate: "Date de début du voyage",
    travelEndDate: "Date de fin du voyage",
    optionalTag: "(facultatif)",
    fullName: "Nom complet",
    email: "E-mail",
    phone: "Téléphone",
    phonePlaceholder: "ex. +213 555 00 01 11",
    invalidPhone: "Entrez un numéro de téléphone valide, avec l'indicatif du pays s'il diffère de votre nationalité.",
    whatsapp: "WhatsApp",
    bookingReferenceLabel: "Référence de réservation",
    bookingReferencePlaceholder: "Si vous avez déjà une réservation avec nous",
    travelersSectionTitle: "Informations des voyageurs",
    travellerNumberLabel: "Voyageur {n}",
    travellerFirstName: "Prénom",
    travellerLastName: "Nom de famille",
    dateOfBirth: "Date de naissance",
    travellerNationality: "Nationalité",
    passportNumber: "Numéro de passeport",
    passportIssuingCountry: "Pays d'émission du passeport",
    passportIssueDate: "Date d'émission du passeport",
    passportExpiry: "Date d'expiration du passeport",
    removeFile: "Retirer le fichier",
    checkingFiles: "Vérification de la qualité des fichiers…",
    pdfQualityNotChecked:
      "La qualité des fichiers PDF ne peut pas être vérifiée automatiquement — assurez-vous que le document est net et complet.",
    qualityLowResolution: "La résolution de l'image est trop basse. Envoyez une photo ou un scan de meilleure qualité.",
    qualityTooDark: "L'image est trop sombre. Reprenez la photo dans un meilleur éclairage.",
    qualityTooBright: "L'image est trop claire/délavée. Reprenez la photo avec un éclairage modéré.",
    qualityTooBlurry: "L'image n'est pas nette (floue). Envoyez une photo plus claire.",
    qualityGlare: "Un reflet ou un éblouissement a été détecté sur le document. Reprenez la photo sans reflet.",
    qualityCropped: "Une partie du document semble coupée. Envoyez la page complète.",
    qualityUnreadable: "Impossible de lire cette image. Vérifiez le fichier et réessayez.",
    notesLabel: "Notes",
    notesPlaceholder: "Autre chose à nous signaler ?",
    sendButton: "Envoyer la demande de visa",
    sending: "Envoi en cours…",
    successTitle: "Demande de visa envoyée !",
    successBody: "Nous avons bien reçu votre demande et notre équipe vous recontactera bientôt pour la suite.",
    referenceLabel: "Votre référence :",
    responseGeneric: "Nous répondons généralement sous un jour ou deux.",
    responseWithHours: "Nous répondons généralement pendant nos horaires :",
    whatsappFaster: "Vous voulez une réponse plus rapide ? Écrivez-nous sur WhatsApp →",
    genericError: "Une erreur s'est produite. Veuillez réessayer.",
    rateLimited: "Plusieurs demandes ont été envoyées récemment. Réessayez plus tard ou contactez-nous directement.",
    tooManyFiles: "Le nombre maximal de fichiers joints est dépassé.",
    unsupportedFileType: "Type de fichier non pris en charge. Autorisés : PDF ou images (JPG, PNG, WEBP, GIF).",
    fileTooLarge: "Le fichier ne doit pas dépasser 4 Mo.",

    caseDetailsSectionTitle: "Détails de votre dossier de visa",
    countryOfResidenceLabel: "Pays de résidence",
    employmentStatusLabel: "Situation professionnelle",
    employmentStatusEmployed: "Salarié",
    employmentStatusSelfEmployed: "Indépendant / entrepreneur",
    employmentStatusStudent: "Étudiant",
    employmentStatusRetired: "Retraité",
    employmentStatusUnemployed: "Sans emploi",
    employmentStatusOther: "Autre",
    accommodationTypeLabel: "Type d'hébergement pendant le voyage",
    accommodationTypeHotel: "Hôtel",
    accommodationTypeHostedByFamilyOrFriend: "Hébergé par de la famille ou des amis",
    accommodationTypeOwnProperty: "Propriété personnelle",
    accommodationTypeOther: "Autre",
    payerTypeLabel: "Qui prend en charge les frais du voyage ?",
    payerTypeSelf: "Le voyageur lui-même",
    payerTypeSponsor: "Un garant / sponsor",
    payerTypeEmployer: "L'employeur",
    payerNameLabel: "Nom du garant / sponsor",
    payerRelationshipLabel: "Lien avec le garant / sponsor",
    hostNameLabel: "Nom de l'hôte / de la personne invitante",
    hostRelationshipLabel: "Lien avec l'hôte / la personne invitante",
    hasPreviousTravelLabel: "Le voyageur a-t-il déjà voyagé à l'international ou obtenu un visa auparavant ?",
    previousTravelNotesLabel: "Détails des voyages ou visas précédents",
    previousTravelNotesPlaceholder: "ex. Visa Schengen en 2024, ou voyage en Turquie en 2023…",
    continueToChecklistButton: "Continuer vers la liste des documents",

    checklistIntro:
      "D'après vos réponses, voici la liste des documents nécessaires pour votre dossier. Merci de téléverser chaque document à l'étape correspondante.",
    checklistStepLabel: "Étape {n} — {name}",
    requirementStatusRequired: "Obligatoire",
    requirementStatusOptional: "Facultatif",
    requirementStatusIfApplicable: "Si applicable à votre situation",
    requirementAppliesToggleLabel: "Cela s'applique-t-il à votre situation ?",
    requirementWhyNeededPrefix: "Pourquoi ce document :",
    requirementAcceptedFormatsPrefix: "Formats acceptés :",
    requirementMaxSizePrefix: "Taille maximale :",
    requirementUploadedFilenamePrefix: "Fichier envoyé :",
    requirementValidationOk: "Vérification technique effectuée ✓",
    requirementValidationPending: "En attente d'envoi",
    uploadButtonLabel: "Téléverser le fichier",
    replaceFileLabel: "Remplacer le fichier",
    backToQuestionnaireButton: "Retour au questionnaire",
    missingRequiredDocuments: "Merci de joindre les documents obligatoires suivants avant d'envoyer : {documents}",
    listSeparator: ", ",
    disclaimerVariesByCase:
      "Les documents requis varient selon la destination, la nationalité, le type de visa et la situation individuelle. Cette liste est un guide de préparation initial — le consulat, l'ambassade ou le centre de demande de visa peut exiger des documents supplémentaires.",
    fallbackUnconfiguredDestinationNote:
      "Nous n'avons pas encore de liste de documents dédiée pour cette destination. Notre équipe examinera votre dossier et vous confirmera les documents nécessaires après réception de votre demande.",
    unrecognizedDocument: "L'un des fichiers envoyés ne correspond pas à la liste de documents établie pour votre dossier.",
    duplicateDocumentForRequirement: "Plusieurs fichiers ont été joints pour le même document requis.",
    documentRejectedForRequirement: "{name} — {reason}",

    requirements: {
      PASSPORT_BIO_PAGE: {
        label: "Passeport — page d'identité (photo)",
        why: "Pour vérifier l'identité et la validité du document de voyage.",
        instruction: "Photographiez ou scannez la page contenant votre photo et vos informations personnelles, de façon nette et complète.",
        acceptedFormatsNote: "PDF ou image",
      },
      NATIONAL_ID: {
        label: "Carte d'identité nationale (si disponible)",
        why: "Pièce d'identité complémentaire pouvant appuyer le dossier.",
        instruction: "Joignez le recto et le verso de votre carte si vous en possédez une.",
        acceptedFormatsNote: "PDF ou image",
      },
      VISA_PHOTO: {
        label: "Photo d'identité récente pour le visa",
        why: "Les spécifications de photo varient selon la destination — nous la demandons donc séparément de tout autre document.",
        instruction: "Photo récente (moins de 6 mois), fond clair uni, sans lunettes ni couvre-chef (sauf motif religieux).",
        acceptedFormatsNote: "Image uniquement",
      },
      PROOF_OF_ACCOMMODATION: {
        label: "Justificatif d'hébergement",
        why: "Pour prouver que vous disposez d'un hébergement confirmé pour toute la durée du séjour.",
        instruction: "Tout document officiel prouvant votre lieu d'hébergement pendant le voyage.",
        acceptedFormatsNote: "PDF ou image",
      },
      HOTEL_RESERVATION: {
        label: "Réservation d'hôtel",
        why: "Preuve d'une réservation effective ou provisoire à l'hôtel indiqué.",
        instruction: "Confirmation de réservation émise par l'hôtel ou la plateforme de réservation, avec les dates et le nom complet.",
        acceptedFormatsNote: "PDF ou image",
      },
      INVITATION_LETTER: {
        label: "Lettre d'invitation de l'hôte",
        why: "Pour prouver qu'une personne dans le pays de destination vous accueille ou vous invite.",
        instruction: "Lettre signée par l'hôte incluant ses coordonnées, son adresse et la durée du séjour proposée.",
        acceptedFormatsNote: "PDF ou image",
      },
      PROOF_OF_RELATIONSHIP_TO_HOST: {
        label: "Justificatif du lien avec l'hôte",
        why: "Pour préciser la nature de la relation avec la personne chez qui vous séjournez.",
        instruction: "Tout document illustrant ce lien (acte de famille, photos communes, échanges antérieurs...).",
        acceptedFormatsNote: "PDF ou image",
      },
      BANK_STATEMENTS: {
        label: "Relevés bancaires",
        why: "Pour prouver la capacité financière à couvrir les frais du voyage.",
        instruction: "Relevé récent couvrant les 3 derniers mois, émis par la banque et à votre nom complet.",
        acceptedFormatsNote: "PDF ou image",
      },
      PAYSLIPS: {
        label: "Bulletins de salaire",
        why: "Pour prouver un revenu mensuel régulier.",
        instruction: "Les 3 derniers bulletins de salaire émis par l'employeur.",
        acceptedFormatsNote: "PDF ou image",
      },
      EMPLOYMENT_CERTIFICATE: {
        label: "Attestation de travail",
        why: "Pour prouver la situation professionnelle actuelle et le lien d'emploi dans le pays de résidence.",
        instruction: "Attestation de travail récente émise par l'employeur, précisant le poste et la date d'embauche.",
        acceptedFormatsNote: "PDF ou image",
      },
      LEAVE_AUTHORIZATION: {
        label: "Autorisation de congé",
        why: "Pour prouver l'obtention d'une autorisation de voyager pendant la période d'emploi.",
        instruction: "Document émis par l'employeur précisant la période de congé accordée.",
        acceptedFormatsNote: "PDF ou image",
      },
      BUSINESS_REGISTRATION: {
        label: "Registre de commerce / document d'enregistrement d'activité",
        why: "Pour prouver l'activité professionnelle indépendante ou la propriété de l'entreprise.",
        instruction: "Copie du registre de commerce ou de tout document attestant l'enregistrement de l'activité.",
        acceptedFormatsNote: "PDF ou image",
      },
      STUDENT_CERTIFICATE: {
        label: "Certificat de scolarité / attestation d'inscription",
        why: "Pour prouver le statut d'étudiant actuel.",
        instruction: "Certificat de scolarité récent délivré par l'établissement.",
        acceptedFormatsNote: "PDF ou image",
      },
      PROPERTY_ASSET_EVIDENCE: {
        label: "Justificatif de propriété ou de patrimoine",
        why: "Pour prouver les attaches et la stabilité dans le pays de résidence.",
        instruction: "Acte de propriété ou tout document officiel équivalent.",
        acceptedFormatsNote: "PDF ou image",
      },
      TRAVEL_ITINERARY: {
        label: "Itinéraire de voyage",
        why: "Pour préciser le plan de voyage et les déplacements prévus.",
        instruction: "Description simplifiée du programme de séjour et des déplacements, jour par jour si possible.",
        acceptedFormatsNote: "PDF ou image",
      },
      RETURN_FLIGHT_RESERVATION: {
        label: "Réservation du vol retour",
        why: "Pour prouver l'intention de quitter le pays de destination à la date prévue.",
        instruction: "Confirmation de réservation (aller-retour) émise par la compagnie aérienne ou l'agence de voyage.",
        acceptedFormatsNote: "PDF ou image",
      },
      TRAVEL_MEDICAL_INSURANCE: {
        label: "Assurance voyage médicale",
        why: "Pour couvrir d'éventuels frais médicaux et d'hospitalisation pendant le séjour.",
        instruction:
          "Attestation d'assurance valable pour toute la durée du séjour et pour le pays de destination. À noter : l'espace Schengen exige légalement une couverture minimale de 30 000 € — les exigences diffèrent pour d'autres destinations.",
        acceptedFormatsNote: "PDF ou image",
      },
      PREVIOUS_VISAS: {
        label: "Visas précédents",
        why: "Aide à l'évaluation de l'historique de voyage.",
        instruction: "Copies des visas précédents, si vous en possédez.",
        acceptedFormatsNote: "PDF ou image",
      },
      PREVIOUS_PASSPORTS: {
        label: "Anciens passeports",
        why: "Aide à l'évaluation de l'historique de voyage.",
        instruction: "Copies des pages d'identité de vos anciens passeports expirés.",
        acceptedFormatsNote: "PDF ou image",
      },
      SPONSOR_FINANCIAL_DOCUMENTS: {
        label: "Documents financiers du garant / sponsor",
        why: "Pour prouver la capacité financière de la personne qui finance le voyage.",
        instruction: "Relevé bancaire ou tout justificatif de revenus du garant.",
        acceptedFormatsNote: "PDF ou image",
      },
      SPONSOR_IDENTITY_DOCUMENTS: {
        label: "Pièce d'identité du garant / sponsor",
        why: "Pour prouver l'identité de la personne qui finance le voyage.",
        instruction: "Copie de la carte d'identité ou du passeport du garant.",
        acceptedFormatsNote: "PDF ou image",
      },
      CIVIL_STATUS_DOCUMENTS: {
        label: "Documents d'état civil",
        why: "Pour prouver un lien familial (mariage, filiation) lorsque cela s'applique.",
        instruction: "Acte de mariage ou de naissance selon votre situation.",
        acceptedFormatsNote: "PDF ou image",
      },
      OTHER_CASE_SPECIFIC: {
        label: "Documents complémentaires propres à votre dossier",
        why: "Pour tout document que vous jugez utile et qui n'est pas mentionné ci-dessus.",
        instruction: "Facultatif — joignez tout document supplémentaire que vous estimez pertinent.",
        acceptedFormatsNote: "PDF ou image",
      },
    },
  },
  contact: {
    getInTouch: "Entrer en contact",
    title: "Contactez-nous",
    intro: "Une question ou envie de planifier votre prochain voyage ? Envoyez-nous un message.",
    name: "Nom",
    email: "E-mail",
    phone: "Téléphone",
    message: "Message",
    messagePlaceholder: "Dites-nous ce que vous recherchez…",
    sendButton: "Envoyer le message",
    sending: "Envoi en cours…",
    successTitle: "Merci de nous avoir contactés !",
    successBody: "Nous avons bien reçu votre message et vous répondrons bientôt.",
    otherWays: "Autres façons de nous joindre",
    regarding: "Concernant :",
    genericError: "Une erreur s'est produite. Veuillez réessayer.",
  },
  planTrip: {
    eyebrow: "Planifiez votre voyage",
    title: "Parlez-nous du voyage de vos rêves",
    intro: "Pas encore choisi un forfait ? Répondez à quelques questions simples et nous vous proposerons ce qui vous convient le mieux.",
    destinationLabel: "Destination préférée",
    destinationPlaceholder: "ex. Turquie, Dubaï, ou je n'ai pas encore décidé",
    budgetLabel: "Budget approximatif (USD)",
    periodLabel: "Période de voyage",
    periodPlaceholder: "ex. été 2027, ou dans deux mois",
    travelersLabel: "Nombre de voyageurs",
    styleLabel: "Style de voyage",
    styleLuxury: "Luxe",
    styleFamily: "Familial",
    styleAdventure: "Aventure",
    styleHoneymoon: "Lune de miel",
    styleBudget: "Économique",
    styleCultural: "Culturel",
    nameLabel: "Nom complet",
    emailLabel: "E-mail",
    phoneLabel: "Téléphone",
    submitButton: "Envoyer ma demande",
    sending: "Envoi en cours…",
    successTitle: "Merci !",
    successBody: "Nous avons bien reçu les détails de votre voyage et notre équipe vous contactera bientôt avec des suggestions adaptées.",
    genericError: "Une erreur s'est produite. Veuillez réessayer.",
  },
  notFound: {
    eyebrow: "Page introuvable",
    title: "Ce voyage semble avoir pris une autre route.",
    body: "La page que vous cherchez n'existe pas ou a peut-être changé d'adresse — mais de vrais voyages n'attendent que d'être réservés.",
    browsePackages: "Découvrir les forfaits",
    backHome: "Retour à l'accueil",
    contactDirectly: "Ou contactez-nous directement",
  },
  errorBoundary: {
    eyebrow: "Une erreur s'est produite",
    title: "Nous avons rencontré un problème pour charger cette page.",
    body: "Ce n'est pas de votre faute — veuillez réessayer, ou revenir en arrière pour continuer.",
    tryAgain: "Réessayer",
    backHome: "Retour à l'accueil",
  },
  whatsappGreeting: "Bonjour {agency}, j'ai une question à propos d'un voyage.",
  whatsappChatLabel: "Discuter avec nous sur WhatsApp",
  languageSwitcher: {
    label: "Langue",
  },
};

const dictionaries: Record<Locale, Dictionary> = { ar, fr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Simple `{token}` interpolation for the handful of dictionary strings
 * that need a runtime value spliced in (a name, an agency, a count). */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Locale-aware plural picker for this dictionary's simplified one/other
 * pairs (see the `stats`/`listing.*.kickerOne` doc comment above). */
export function plural(count: number, one: string, other: string): string {
  return count === 1 ? one : other;
}
