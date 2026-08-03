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
      title: "منتقاة بعناية، لا آلية",
      copy: "كل رحلة وإقامة وتجربة هنا اختارها فريقنا بعناية — وليست مستقاة من نظام مخزون آلي.",
    },
    {
      title: "تأكيد من شخص حقيقي",
      copy: "تُراجَع طلبات الحجز ويؤكدها فريقنا قبل إتمام أي شيء نهائيًا — لا حجز فوري بلا إشراف بشري.",
    },
    {
      title: "محادثة واحدة من البداية إلى النهاية",
      copy: "تواصلوا معنا عبر البريد الإلكتروني أو الهاتف أو واتساب، وابقوا على تواصل مع الفريق نفسه طوال رحلتكم.",
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
  exploreMore: {
    title: "كل ما تحتاجونه لرحلتكم",
    subtitle: "رحلات وإقامات وأنشطة — كل ذلك في مكان واحد.",
    flights: "الرحلات الجوية",
    hotels: "الفنادق",
    activities: "الأنشطة",
    viewAll: "عرض الكل",
  },
  closingCta: {
    title: "هل أنتم مستعدون للتخطيط لرحلتكم القادمة؟",
    subtitle: "أخبرونا بما يدور في ذهنكم وسنتولى الباقي.",
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
      title: "Une sélection humaine, pas automatisée",
      copy: "Chaque voyage, séjour et expérience ici a été choisi par notre équipe — jamais issu d'un flux d'inventaire automatisé.",
    },
    {
      title: "Confirmé par une personne",
      copy: "Chaque demande de réservation est vérifiée et confirmée par notre équipe avant toute finalisation — jamais de réservation instantanée sans supervision.",
    },
    {
      title: "Un seul interlocuteur, du début à la fin",
      copy: "Contactez-nous par e-mail, téléphone ou WhatsApp, et gardez le même interlocuteur tout au long de votre voyage.",
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
  exploreMore: {
    title: "Tout pour votre voyage",
    subtitle: "Vols, séjours et activités — tout au même endroit.",
    flights: "Vols",
    hotels: "Hôtels",
    activities: "Activités",
    viewAll: "Voir tout",
  },
  closingCta: {
    title: "Prêt à planifier votre prochain voyage ?",
    subtitle: "Dites-nous ce que vous avez en tête, et nous nous occupons du reste.",
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
