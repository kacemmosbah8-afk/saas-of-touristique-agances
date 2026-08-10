import { locales, type Locale } from "@/shared/i18n/dictionary";

export { locales };
export type { Locale };

/**
 * Admin-panel dictionary — separate from `shared/i18n/dictionary.ts` (the
 * public storefront's dictionary) because the vocabulary is a different
 * domain entirely (CRM/inventory/ops terms, not marketing copy) and the
 * admin is used by one logged-in owner, not anonymous visitors. Shares the
 * same underlying mechanism though: the `NEXT_LOCALE` cookie
 * (`shared/lib/i18n/locale.ts`) drives both, so switching language in
 * either the public site or the admin switches it everywhere for that
 * browser.
 *
 * Arabic (`ar`) is the primary language (this dictionary's `defaultLocale`
 * export), French (`fr`) the optional secondary — same convention as the
 * public site.
 */

export type AdminDictionary = {
  shell: {
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
      visaRequests: string;
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
  dashboard: {
    welcomeTitle: string;
    signedInAs: string;
    tagline: string;
    salesSection: string;
    inventorySection: string;
    customers: string;
    openLeads: string;
    packages: string;
    hotels: string;
    transportation: string;
    guides: string;
    suppliers: string;
    activities: string;
    destinations: string;
  };
  common: {
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
  leads: {
    pageTitle: string;
    openLead: string;
    won: string;
    lost: string;
    addLead: string;
    statOpenLeads: string;
    statPipelineValue: string;
    statWon: string;
    statOverdueReminders: string;
    searchPlaceholder: string;
    allStages: string;
    allOwners: string;
    allSources: string;
    noLeads: string;
    stage: string;
    owner: string;
    unassigned: string;
    convertToCustomer: string;
    viewCustomer: string;
    lostPrefix: string;
    tabDetails: string;
    tabNotes: string;
    tabReminders: string;
    tabHistory: string;
    planMyTrip: string;
    planMyTripAnswers: string;
    destination: string;
    travelPeriod: string;
    travelers: string;
    style: string;
    contact: string;
    email: string;
    phone: string;
    writeNote: string;
    addNote: string;
    noNotesYet: string;
    deleteNote: string;
    followUpPlaceholder: string;
    addReminder: string;
    noReminders: string;
    due: string;
    overdue: string;
    reopenReminder: string;
    completeReminder: string;
    deleteReminder: string;
    noHistoryYet: string;
    ownerUpdated: string;
    leadConverted: string;
    convertConfirmTitle: string;
    convertConfirmBody: string;
    lostReasonPrompt: string;
    form: {
      leadTitle: string;
      leadTitlePlaceholder: string;
      contactName: string;
      contactNamePlaceholder: string;
      source: string;
      unknown: string;
      email: string;
      phone: string;
      estValue: string;
      currency: string;
      expectedCloseDate: string;
      owner: string;
      unassigned: string;
      notes: string;
      createLead: string;
      saveLead: string;
      leadCreated: string;
      saved: string;
    };
  };
  bookingRequests: {
    pageTitle: string;
    pageSubtitle: string;
    searchPlaceholder: string;
    allStatuses: string;
    allProductTypes: string;
    noRequests: string;
    reference: string;
    product: string;
    travelers: string;
    adults: string;
    children: string;
    preferredDate: string;
    returnDate: string;
    contact: string;
    status: string;
    statusUpdated: string;
    convertToBooking: string;
    tabDetails: string;
    tabActivity: string;
    requestedBy: string;
    travelDate: string;
    pax: string;
    received: string;
    noMatch: string;
    fullName: string;
    phone: string;
    whatsapp: string;
    notes: string;
    requestedProduct: string;
    type: string;
    listing: string;
    contactSection: string;
    customerRecord: string;
    travelDetails: string;
    travellersValue: (adults: number, children: number) => string;
    notesFromTraveler: string;
    actions: string;
    timeline: string;
    convertedTo: string;
    viewBooking: string;
    rejectedOn: string;
    cancelledOn: string;
    emailAction: string;
    call: string;
    copyEmail: string;
    copyPhone: string;
    emailCopied: string;
    phoneCopied: string;
    markContacted: string;
    revertToPending: string;
    reject: string;
    cancelAction: string;
    reasonPlaceholder: string;
    confirmReject: string;
    confirmCancel: string;
    back: string;
    addNote: string;
    notePlaceholder: string;
    saveNote: string;
    markedContacted: string;
    requestRejected: string;
    requestCancelled: string;
    bookingCreated: string;
    noteAdded: string;
  };
  visaRequests: {
    pageTitle: string;
    pageSubtitle: string;
    exportCsv: string;
    searchPlaceholder: string;
    allStatuses: string;
    noMatch: string;
    reference: string;
    requestedBy: string;
    destination: string;
    visaType: string;
    pax: string;
    status: string;
    received: string;
    statusUpdated: string;
    requestSection: string;
    destinationLabel: string;
    nationalityLabel: string;
    visaTypeLabel: string;
    travelStartDate: string;
    travelEndDate: string;
    bookingLinked: string;
    contactSection: string;
    fullName: string;
    phone: string;
    phoneFormatValidated: string;
    phoneVerified: string;
    phoneNotVerified: string;
    whatsapp: string;
    customerRecord: string;
    travelersSection: string;
    travellerName: string;
    dateOfBirth: string;
    passportNumber: string;
    passportIssuingCountry: string;
    passportIssueDate: string;
    passportExpiry: string;
    documentsSection: string;
    noDocuments: string;
    documentDownload: string;
    documentCategoryPassport: string;
    documentCategoryImage: string;
    documentCategoryPdf: string;
    documentCategoryVisa: string;
    documentCategoryContract: string;
    documentCategoryInsurance: string;
    documentCategoryNationalId: string;
    documentCategoryVaccination: string;
    documentCategoryOther: string;
    notesFromTraveler: string;
    actions: string;
    timeline: string;
    approvedOn: string;
    rejectedOn: string;
    cancelledOn: string;
    emailAction: string;
    call: string;
    copyEmail: string;
    copyPhone: string;
    emailCopied: string;
    phoneCopied: string;
    revertToPending: string;
    reject: string;
    cancelAction: string;
    reasonPlaceholder: string;
    confirmReject: string;
    confirmCancel: string;
    back: string;
    addNote: string;
    notePlaceholder: string;
    saveNote: string;
    requestRejected: string;
    requestCancelled: string;
    noteAdded: string;
  };
  customers: {
    pageTitle: string;
    addCustomer: string;
    searchPlaceholder: string;
    allTypes: string;
    allSources: string;
    noMatch: string;
    addFirst: string;
    columnCustomer: string;
    columnType: string;
    columnContact: string;
    columnSource: string;
    statusUpdated: string;
    deleteConfirmTitle: string;
    deleteConfirmBody: string;
    deleted: string;
    detail: {
      backToList: string;
      noContactInfo: string;
      tabProfile: string;
      tabContacts: string;
      tabNotes: string;
      tabTimeline: string;
      statNotes: string;
      statActivities: string;
      statLeads: string;
      statCustomerFor: string;
      profileEmail: string;
      profilePhone: string;
      profileNationality: string;
      profilePassport: string;
      profileNotes: string;
    };
    contacts: {
      heading: string;
      addContact: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      role: string;
      rolePlaceholder: string;
      primaryContact: string;
      save: string;
      saving: string;
      cancel: string;
      noContacts: string;
      noContactInfo: string;
      editContactAria: string;
      deleteContactAria: string;
      deleteConfirmTitle: string;
      deleted: string;
    };
    addresses: {
      heading: string;
      addAddress: string;
      label: string;
      labelPlaceholder: string;
      line1: string;
      line2: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      primaryAddress: string;
      save: string;
      saving: string;
      cancel: string;
      noAddresses: string;
      addressFallback: string;
      editAddressAria: string;
      deleteAddressAria: string;
      deleteConfirmTitle: string;
      deleted: string;
    };
    notes: {
      writeNote: string;
      addNote: string;
      saving: string;
      noNotesYet: string;
      deleteNoteAria: string;
      added: string;
    };
    timeline: {
      noActivityYet: string;
    };
    tags: {
      noTags: string;
      addTagPlaceholder: string;
      attachTagAria: string;
      removeTagAria: (name: string) => string;
    };
    form: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      customerType: string;
      leadSource: string;
      unknown: string;
      preferredContact: string;
      dateOfBirth: string;
      nationality: string;
      passportNumber: string;
      passportExpiry: string;
      accountManager: string;
      unassigned: string;
      generalNotes: string;
      internal: string;
      saving: string;
      createCustomer: string;
      saveProfile: string;
      possibleDuplicates: (count: number) => string;
      created: string;
      saved: string;
    };
  };
  settings: {
    pageTitle: string;
    pageSubtitle: string;
    yourPublicWebsite: string;
    publicWebsiteIntro1: string;
    publicWebsiteIntro2: string;
    aboutAgency: string;
    tagline: string;
    taglinePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    enableFrench: string;
    frenchNote: string;
    taglineFr: string;
    taglineFrPlaceholder: string;
    descriptionFr: string;
    descriptionFrPlaceholder: string;
    contactInfo: string;
    contactInfoIntro: string;
    contactEmail: string;
    contactPhone: string;
    whatsappNumber: string;
    businessHoursAr: string;
    businessHoursFr: string;
    fallsBackToArabic: string;
    addressAr: string;
    addressFr: string;
    socialLinks: string;
    testimonials: string;
    testimonialsIntro: string;
    testimonialsAr: string;
    testimonialsFr: string;
    testimonialsFrNote: string;
    savePublicSettings: string;
    security: {
      title: string;
      intro: string;
      currentPassword: string;
      newPassword: string;
      confirmNewPassword: string;
      savePassword: string;
      saving: string;
      passwordUpdated: string;
    };
  };
  documents: {
    pageTitle: string;
    pageSubtitleCount: (count: number) => string;
    searchPlaceholder: string;
    allCategories: string;
    uploadDocument: string;
    uploading: string;
    noDocuments: string;
    renameAction: string;
    replaceFileAction: string;
    deleteDocumentAction: string;
    deleteConfirmTitle: string;
    uploaded: string;
    updated: string;
    replaced: string;
    deleted: string;
    failedToSave: string;
    failedToReplace: string;
    uploadFailedPrefix: string;
  };
  search: {
    pageTitle: string;
    pageSubtitle: string;
    defaultPlaceholder: string;
    ariaLabel: string;
    typeToSearch: string;
    noResults: (query: string) => string;
  };
  guides: {
    pageTitle: string;
    addGuide: string;
    addFirstGuide: string;
    pageSubtitleCount: (count: number) => string;
    searchPlaceholder: string;
    noMatch: string;
    attachmentHint: string;
    attachmentLinkLabel: string;
    attachedTo: string;
    notAttached: string;
    columnGuide: string;
    columnLanguages: string;
    columnExperience: string;
    columnDailyRate: string;
    columnStatus: string;
    yearsAbbrev: string;
    statusUpdated: string;
    deleted: string;
    newPageTitle: string;
    form: {
      guideName: string;
      languages: string;
      languagesPlaceholder: string;
      certifications: string;
      certificationsPlaceholder: string;
      experienceYears: string;
      dailyRate: string;
      currency: string;
      city: string;
      country: string;
      email: string;
      phone: string;
      availabilityNotes: string;
      availabilityPlaceholder: string;
      internalNotes: string;
      notShownToCustomers: string;
      saving: string;
      createGuide: string;
      save: string;
      created: string;
      saved: string;
    };
  };
  transport: {
    pageTitle: string;
    addProvider: string;
    addFirstProvider: string;
    pageSubtitleCount: (count: number) => string;
    searchPlaceholder: string;
    allTypes: string;
    noMatch: string;
    columnProvider: string;
    columnType: string;
    columnLocation: string;
    columnPhone: string;
    columnStatus: string;
    statusUpdated: string;
    deleted: string;
    newPageTitle: string;
    form: {
      companyName: string;
      type: string;
      city: string;
      country: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      website: string;
      fleetNotes: string;
      fleetNotesPlaceholder: string;
      pricingNotes: string;
      pricingNotesPlaceholder: string;
      internalNotes: string;
      notShownToCustomers: string;
      saving: string;
      createProvider: string;
      save: string;
      created: string;
      saved: string;
    };
  };
  suppliers: {
    pageTitle: string;
    addSupplier: string;
    addFirstSupplier: string;
    pageSubtitleCount: (count: number) => string;
    statTotalSuppliers: string;
    statActive: string;
    statAvgRating: string;
    statTopCategory: string;
    searchPlaceholder: string;
    allTypes: string;
    noMatch: string;
    columnSupplier: string;
    columnType: string;
    columnLocation: string;
    columnRating: string;
    columnStatus: string;
    statusUpdated: string;
    deleted: string;
    newPageTitle: string;
    tabDetails: string;
    tabContacts: string;
    tabDocuments: string;
    form: {
      supplierName: string;
      type: string;
      internalRating: string;
      unrated: string;
      contactName: string;
      email: string;
      phone: string;
      website: string;
      address: string;
      city: string;
      country: string;
      notes: string;
      saving: string;
      createSupplier: string;
      save: string;
      created: string;
      saved: string;
    };
    contacts: {
      heading: string;
      subtitle: string;
      addContact: string;
      name: string;
      role: string;
      rolePlaceholder: string;
      primaryContact: string;
      save: string;
      saving: string;
      cancel: string;
      noContacts: string;
      noContactInfo: string;
      editContactAria: string;
      deleteContactAria: string;
      deleteConfirmTitle: string;
      deleted: string;
    };
    documents: {
      heading: string;
      subtitle: string;
      kindDocument: string;
      kindContract: string;
      upload: string;
      uploading: string;
      noDocuments: string;
      added: string;
      removed: string;
      failedToSave: string;
      uploadFailedPrefix: string;
    };
  };
  activities: {
    pageTitle: string;
    pageSubtitleIntro: string;
    pageSubtitleCount: (count: number) => string;
    addActivity: string;
    addFirstActivity: string;
    searchPlaceholder: string;
    noMatch: string;
    columnActivity: string;
    columnCategory: string;
    columnDuration: string;
    columnPrice: string;
    columnStatus: string;
    minutesAbbrev: string;
    hoursAbbrev: string;
    statusUpdated: string;
    deleted: string;
    newPageTitle: string;
    viewOnPublicSite: string;
    notLiveYet: string;
    tabDetails: string;
    tabMedia: string;
    form: {
      nameAr: string;
      urlSlug: string;
      featured: string;
      featuredDescription: string;
      categoryAr: string;
      durationMinutes: string;
      cityAr: string;
      countryAr: string;
      meetingPointAr: string;
      descriptionAr: string;
      includedAr: string;
      excludedAr: string;
      supplier: string;
      noSupplier: string;
      internalCost: string;
      sellingPrice: string;
      currency: string;
      saving: string;
      createActivity: string;
      saveDetails: string;
      created: string;
      saved: string;
      cancel: string;
      recommended: string;
      pictureRequired: string;
      fixErrorsBeforeSubmitting: string;
      previous: string;
      next: string;
      stepIndicator: (step: number, total: number) => string;
      reviewCoverImage: string;
      reviewGalleryCount: (count: number) => string;
      reviewNoMedia: string;
      notSet: string;
      sections: {
        general: string;
        generalHint: string;
        location: string;
        locationHint: string;
        description: string;
        descriptionHint: string;
        inclusions: string;
        inclusionsHint: string;
        pricing: string;
        pricingHint: string;
        media: string;
        mediaHint: string;
        review: string;
        reviewHint: string;
      };
    };
  };
  destinations: {
    pageTitle: string;
    pageSubtitleIntro: string;
    pageSubtitleCount: (count: number) => string;
    addDestination: string;
    addFirstDestination: string;
    searchPlaceholder: string;
    noMatch: string;
    columnDestination: string;
    columnCountry: string;
    columnRegion: string;
    columnStatus: string;
    statusUpdated: string;
    deleted: string;
    newPageTitle: string;
    viewOnPublicSite: string;
    notLiveYet: string;
    tabDetails: string;
    tabMedia: string;
    tabSeo: string;
    heroImageTitle: string;
    heroImageDescription: string;
    form: {
      nameAr: string;
      urlSlug: string;
      featured: string;
      featuredDescription: string;
      countryAr: string;
      regionAr: string;
      cityAr: string;
      descriptionAr: string;
      attractionsAr: string;
      saving: string;
      createDestination: string;
      saveDetails: string;
      created: string;
      saved: string;
      cancel: string;
      recommended: string;
      pictureRequired: string;
      fixErrorsBeforeSubmitting: string;
      previous: string;
      next: string;
      stepIndicator: (step: number, total: number) => string;
      reviewCoverImage: string;
      reviewGalleryCount: (count: number) => string;
      reviewNoMedia: string;
      notSet: string;
      sections: {
        general: string;
        generalHint: string;
        description: string;
        location: string;
        locationHint: string;
        content: string;
        contentHint: string;
        media: string;
        mediaHint: string;
        review: string;
        reviewHint: string;
      };
    };
    seo: {
      seoTitleAr: string;
      seoDescriptionAr: string;
      charsCount: (count: number) => string;
      searchPreview: string;
      addSeoDescriptionPlaceholder: string;
      saving: string;
      saveSeo: string;
      seoSaved: string;
    };
  };
  hotels: {
    pageTitle: string;
    pageSubtitleIntro: string;
    pageSubtitleCount: (count: number) => string;
    addHotel: string;
    addFirstHotel: string;
    searchPlaceholder: string;
    allCategories: string;
    allStars: string;
    starsLabel: (count: number) => string;
    noMatch: string;
    columnHotel: string;
    columnCategory: string;
    columnLocation: string;
    columnRooms: string;
    columnStatus: string;
    statusUpdated: string;
    deleted: string;
    newPageTitle: string;
    lastUpdated: (date: string) => string;
    viewOnPublicSite: string;
    notLiveYet: string;
    tabDetails: string;
    tabMedia: string;
    tabRooms: string;
    coverImageDescription: string;
    galleryDescription: string;
    form: {
      nameAr: string;
      urlSlug: string;
      featured: string;
      featuredDescription: string;
      category: string;
      stars: string;
      cityAr: string;
      countryAr: string;
      addressAr: string;
      latitude: string;
      longitude: string;
      descriptionAr: string;
      amenitiesAr: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      website: string;
      internalNotes: string;
      notShownToCustomers: string;
      saving: string;
      createHotel: string;
      saveDetails: string;
      created: string;
      saved: string;
      cancel: string;
      recommended: string;
      pictureRequired: string;
      fixErrorsBeforeSubmitting: string;
      previous: string;
      next: string;
      stepIndicator: (step: number, total: number) => string;
      reviewCoverImage: string;
      reviewGalleryCount: (count: number) => string;
      reviewNoMedia: string;
      notSet: string;
      sections: {
        general: string;
        generalHint: string;
        description: string;
        location: string;
        locationHint: string;
        details: string;
        detailsHint: string;
        contact: string;
        contactHint: string;
        media: string;
        mediaHint: string;
        review: string;
        reviewHint: string;
      };
    };
    rooms: {
      heading: string;
      subtitle: string;
      addRoomType: string;
      noRoomTypes: string;
      save: string;
      cancel: string;
      saving: string;
      deleteConfirmTitle: string;
      deleted: string;
      editAria: string;
      deleteAria: string;
      type: string;
      nameAr: string;
      nameFr: string;
      optionalFallsBackAr: string;
      capacity: string;
      beds: string;
      maxOccupancy: string;
      currency: string;
      basePrice: string;
      perNight: string;
      internalCost: string;
      net: string;
      photos: string;
      notesAr: string;
      notesFr: string;
      optional: string;
      pax: string;
      bedsAbbrev: (count: number) => string;
      perNightSuffix: string;
    };
  };
  flights: {
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
    viewOnPublicSite: string;
    notLiveYet: string;
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
  packages: {
    pageTitle: string;
    pageSubtitleIntro: string;
    pageSubtitleCount: (count: number) => string;
    newPackage: string;
    newPageSubtitle: string;
    lastUpdated: (date: string) => string;
    viewOnPublicSite: string;
    notLiveYet: string;
    createFirstPackage: string;
    searchPlaceholder: string;
    allStatuses: string;
    statusDraft: string;
    statusPublished: string;
    statusArchived: string;
    noMatch: string;
    columnPackage: string;
    columnStatus: string;
    columnDestination: string;
    columnDuration: string;
    columnFromPrice: string;
    columnUpdated: string;
    daysAbbrev: string;
    nightsAbbrev: string;
    statusUpdated: string;
    deleted: string;
    duplicated: string;
    duplicate: string;
    publish: string;
    unpublish: string;
    archive: string;
    restoreToDraft: string;
    statusSectionHeading: string;
    statusSectionSubtitle: string;
    dangerZoneHeading: string;
    dangerZoneSubtitle: string;
    deletePackage: string;
    tabDetails: string;
    tabBuilder: string;
    tabMedia: string;
    tabSeo: string;
    tabItinerary: string;
    tabInventory: string;
    coverImageDescription: string;
    galleryDescription: string;
    noItineraryConfigured: string;
    dayLabel: string;
    noSeoConfigured: string;
    yes: string;
    detailsForm: {
      nameAr: string;
      urlSlug: string;
      shortDescriptionAr: string;
      maxChars: string;
      fullDescriptionAr: string;
      destinationAr: string;
      countryAr: string;
      durationDays: string;
      durationNights: string;
      categoryAr: string;
      difficulty: string;
      selectDifficulty: string;
      difficultyEasy: string;
      difficultyModerate: string;
      difficultyChallenging: string;
      difficultyExtreme: string;
      internalCost: string;
      notShownPublicly: string;
      fromPrice: string;
      fromPriceHint: string;
      currency: string;
      featured: string;
      featuredDescription: string;
      saving: string;
      saveDetails: string;
      saved: string;
    };
    builderForm: {
      highlightsAr: string;
      includedAr: string;
      excludedAr: string;
      importantNotesAr: string;
      whatToBringAr: string;
      meetingPointAr: string;
      cancellationPolicyAr: string;
      saving: string;
      saveBuilderContent: string;
      saved: string;
    };
    seoForm: {
      seoTitleAr: string;
      charsCount: (count: number) => string;
      seoDescriptionAr: string;
      previewAr: string;
      noDescription: string;
      saving: string;
      saveSeo: string;
      saved: string;
    };
    createForm: {
      name: string;
      description: string;
      urlSlug: string;
      creating: string;
      createPackage: string;
      cancel: string;
      created: string;
    };
    readOnly: {
      name: string;
      slug: string;
      shortDescription: string;
      description: string;
      destination: string;
      country: string;
      duration: string;
      category: string;
      difficulty: string;
      featured: string;
      highlights: string;
      included: string;
      excluded: string;
      importantNotes: string;
      whatToBring: string;
      meetingPoint: string;
      cancellationPolicy: string;
      seoTitle: string;
      seoDescription: string;
    };
  };
  itinerary: {
    noItineraryYet: string;
    addFirstDay: string;
    addDay: (n: number) => string;
    dayLabel: string;
    failedToReorderDays: string;
    failedToReorderActivities: string;
    dragToReorderDay: string;
    dragToReorderActivity: string;
    expand: string;
    collapse: string;
    editDay: string;
    deleteDay: string;
    deleteDayConfirmTitle: string;
    failedToDeleteDay: string;
    addActivity: string;
    editActivity: string;
    deleteActivity: string;
    deleteActivityConfirmTitle: string;
    failedToDeleteActivity: string;
    breakfastAbbrev: string;
    lunchAbbrev: string;
    dinnerAbbrev: string;
    dayForm: {
      titleAr: string;
      titleFr: string;
      optionalFallsBackAr: string;
      descriptionAr: string;
      descriptionFr: string;
      optional: string;
      breakfastAr: string;
      lunchAr: string;
      dinnerAr: string;
      breakfastFr: string;
      lunchFr: string;
      dinnerFr: string;
      transferNotesAr: string;
      transferNotesFr: string;
      accommodationAr: string;
      accommodationFr: string;
      internalNotes: string;
      saving: string;
      saveDay: string;
      cancel: string;
    };
    activityForm: {
      titleAr: string;
      titleFr: string;
      optionalFallsBackAr: string;
      descriptionAr: string;
      descriptionFr: string;
      optional: string;
      duration: string;
      durationHint: string;
      saving: string;
      save: string;
      cancel: string;
    };
  };
  bookings: {
    pageTitle: string;
    statsSummary: (total: number, active: number, upcoming: number) => string;
    newBooking: string;
    statActiveRevenue: string;
    statConfirmed: string;
    statInProgress: string;
    statCompleted: string;
    searchPlaceholder: string;
    allStatuses: string;
    allAgents: string;
    noMatch: string;
    createFirstBooking: string;
    columnReference: string;
    columnCustomer: string;
    columnTravelDates: string;
    columnPax: string;
    columnStatus: string;
    columnTotal: string;
    backToList: string;
    newPageTitle: string;
    newPageSubtitle: string;
    needCustomerFirst: string;
    addCustomer: string;
    cancelledOn: (date: string) => string;
    lineItems: string;
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    travellers: string;
    supplierConfirmations: string;
    vouchers: string;
    customerFacingNotes: string;
    internalNotes: string;
    detailsHeading: string;
    travelStart: string;
    travelEnd: string;
    travellersValue: (adults: number, children: number) => string;
    agent: string;
    unassigned: string;
    created: string;
    statusHeading: string;
    timeline: string;
    statusActions: {
      markStatus: (status: string) => string;
      cancelBooking: string;
      reasonPlaceholder: string;
      confirmCancellation: string;
      keepBooking: string;
      assignedAgent: string;
      statusUpdatedTo: (status: string) => string;
      cancelled: string;
      agentUpdated: string;
    };
    itemsEditor: {
      columnType: string;
      columnDescription: string;
      columnQty: string;
      columnUnit: string;
      columnAmount: string;
      editItemAria: string;
      deleteItemAria: string;
      noItemsYet: string;
      type: string;
      description: string;
      descriptionPlaceholder: string;
      quantity: string;
      unitPrice: string;
      notesOptional: string;
      lineAmount: string;
      saveItem: string;
      addItem: string;
      cancel: string;
      invalidItem: string;
      itemUpdated: string;
      itemAdded: string;
      itemRemoved: string;
    };
    form: {
      customer: string;
      selectCustomer: string;
      packageOptional: string;
      noPackage: string;
      travelStart: string;
      travelEnd: string;
      adults: string;
      children: string;
      agent: string;
      unassigned: string;
      currency: string;
      discount: string;
      tax: string;
      customerFacingNotes: string;
      internalNotes: string;
      saving: string;
      createBooking: string;
      saveBooking: string;
      created: string;
      saved: string;
    };
  };
  confirmations: {
    addLineItemsHint: string;
    notRequested: string;
    request: string;
    reRequest: string;
    confirm: string;
    reject: string;
    linkSupplierPlaceholder: string;
    noSupplierRecord: string;
    supplierNamePlaceholder: string;
    sendRequest: string;
    confirmationRequested: string;
    confirmationNumberPlaceholder: string;
    saveConfirmation: string;
    markedConfirmed: string;
    reasonPlaceholder: string;
    markRejected: string;
    markedRejected: string;
    statusPending: string;
    statusConfirmed: string;
    statusRejected: string;
  };
  quotes: {
    pageTitle: string;
    statsSummary: (total: number, sent: number, acceptanceRate: number) => string;
    newQuote: string;
    statOpenValue: string;
    statSent: string;
    statAccepted: string;
    statConverted: string;
    searchPlaceholder: string;
    allStatuses: string;
    allAgents: string;
    noMatch: string;
    createFirstQuote: string;
    columnReference: string;
    columnCustomer: string;
    columnValidUntil: string;
    columnStatus: string;
    columnTotal: string;
    viewBooking: string;
    backToList: string;
    newPageTitle: string;
    newPageSubtitle: string;
    needCustomerFirst: string;
    addCustomer: string;
    editQuoteHeader: string;
    editQuotePageTitle: string;
    convertedOn: (date: string) => string;
    declinedOn: (date: string) => string;
    expiredNotice: (date: string) => string;
    lineItems: string;
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    customerFacingNotes: string;
    termsAndConditions: string;
    internalNotes: string;
    detailsHeading: string;
    validUntil: string;
    travelStart: string;
    travelEnd: string;
    travellersLabel: string;
    travellersValue: (adults: number, children: number) => string;
    agent: string;
    unassigned: string;
    created: string;
    statusHeading: string;
    timeline: string;
    statusActions: {
      convertToBooking: string;
      markStatus: (status: string) => string;
      decline: string;
      reasonPlaceholder: string;
      confirmDecline: string;
      keepQuote: string;
      assignedAgent: string;
      statusUpdatedTo: (status: string) => string;
      declined: string;
      bookingCreated: string;
      agentUpdated: string;
    };
    itemsEditor: {
      columnType: string;
      columnDescription: string;
      columnQty: string;
      columnUnit: string;
      columnAmount: string;
      editItemAria: string;
      deleteItemAria: string;
      noItemsYet: string;
      addFromCatalog: string;
      pickInventoryItem: string;
      manualEntry: string;
      noRateOnFile: string;
      type: string;
      description: string;
      descriptionPlaceholder: string;
      quantity: string;
      unitPrice: string;
      notesOptional: string;
      lineAmount: string;
      saveItem: string;
      addItem: string;
      cancel: string;
      invalidItem: string;
      itemUpdated: string;
      itemAdded: string;
      itemRemoved: string;
      catalogHotels: string;
      catalogActivities: string;
      catalogGuides: string;
      catalogTransport: string;
    };
    form: {
      customer: string;
      selectCustomer: string;
      packageOptional: string;
      noPackage: string;
      validUntil: string;
      agent: string;
      unassigned: string;
      travelStart: string;
      travelEnd: string;
      adults: string;
      children: string;
      currency: string;
      discount: string;
      tax: string;
      customerFacingNotes: string;
      termsAndConditions: string;
      termsPlaceholder: string;
      internalNotes: string;
      saving: string;
      createQuote: string;
      saveQuote: string;
      created: string;
      saved: string;
    };
  };
  vouchers: {
    pickServiceLine: string;
    voucherIssued: string;
    voucherCancelled: string;
    noVouchersYet: string;
    issued: string;
    cancelled: string;
    cancelVoucherAria: string;
    serviceLine: string;
    pickServiceToVoucher: string;
    issueVoucher: string;
    backToBooking: string;
    serviceVoucherLabel: string;
    valid: string;
    cancelledLabel: string;
    cancelledNotice: (date: string) => string;
    service: string;
    supplier: string;
    confirmationNumber: string;
    bookingReference: string;
    leadCustomer: string;
    from: string;
    to: string;
    travellers: string;
    issuedByFooter: (date: string, agency: string) => string;
  };
};

const ar: AdminDictionary = {
  shell: {
    nav: {
      overview: "نظرة عامة",
      sales: "المبيعات",
      operations: "العمليات",
      inventory: "الخدمات",
      system: "النظام",
      dashboard: "لوحة التحكم",
      customers: "العملاء",
      leads: "العملاء المحتملون",
      bookingRequests: "طلبات الحجز",
      visaRequests: "طلبات التأشيرة",
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
  },
  dashboard: {
    welcomeTitle: "مرحبًا بكم في",
    signedInAs: "مسجّل الدخول بصفة",
    tagline: "دليل خدماتكم ومورديكم.",
    salesSection: "المبيعات",
    inventorySection: "الخدمات",
    customers: "العملاء",
    openLeads: "العملاء المحتملون النشطون",
    packages: "الباقات",
    hotels: "الفنادق",
    transportation: "النقل",
    guides: "المرشدون السياحيون",
    suppliers: "الموردون",
    activities: "الأنشطة",
    destinations: "الوجهات",
  },
  common: {
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
  },
  leads: {
    pageTitle: "العملاء المحتملون",
    openLead: "عميل محتمل نشط",
    won: "ناجح",
    lost: "خاسر",
    addLead: "إضافة عميل محتمل",
    statOpenLeads: "العملاء المحتملون النشطون",
    statPipelineValue: "قيمة خط المبيعات",
    statWon: "ناجح",
    statOverdueReminders: "تذكيرات متأخرة",
    searchPlaceholder: "بحث في العملاء المحتملين…",
    allStages: "كل المراحل",
    allOwners: "كل المسؤولين",
    allSources: "كل المصادر",
    noLeads: "لا يوجد عملاء محتملون.",
    stage: "المرحلة",
    owner: "المسؤول",
    unassigned: "غير مُسنَد",
    convertToCustomer: "تحويل إلى عميل",
    viewCustomer: "عرض العميل",
    lostPrefix: "خاسر:",
    tabDetails: "التفاصيل",
    tabNotes: "الملاحظات",
    tabReminders: "التذكيرات",
    tabHistory: "السجل",
    planMyTrip: "خطط لرحلتك",
    planMyTripAnswers: "إجابات خطط لرحلتك",
    destination: "الوجهة",
    travelPeriod: "فترة السفر",
    travelers: "المسافرون",
    style: "الأسلوب",
    contact: "جهة الاتصال",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    writeNote: "اكتب ملاحظة…",
    addNote: "إضافة ملاحظة",
    noNotesYet: "لا توجد ملاحظات بعد.",
    deleteNote: "حذف الملاحظة",
    followUpPlaceholder: "متابعة مع العميل…",
    addReminder: "إضافة",
    noReminders: "لا توجد تذكيرات.",
    due: "الاستحقاق",
    overdue: "متأخر",
    reopenReminder: "إعادة فتح التذكير",
    completeReminder: "إتمام التذكير",
    deleteReminder: "حذف التذكير",
    noHistoryYet: "لا يوجد سجل بعد.",
    ownerUpdated: "تم تحديث المسؤول.",
    leadConverted: "تم تحويل العميل المحتمل.",
    convertConfirmTitle: "تحويل هذا العميل المحتمل إلى عميل؟",
    convertConfirmBody: "سيتم تحديد العميل المحتمل كـ«ناجح».",
    lostReasonPrompt: "سبب خسارة هذا العميل المحتمل؟ (اختياري)",
    form: {
      leadTitle: "عنوان العميل المحتمل",
      leadTitlePlaceholder: "رحلة شهر عسل إلى بالي — 10 أيام",
      contactName: "اسم جهة الاتصال",
      contactNamePlaceholder: "سارة بن علي",
      source: "المصدر",
      unknown: "غير معروف",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      estValue: "القيمة التقديرية",
      currency: "العملة",
      expectedCloseDate: "تاريخ الإغلاق المتوقع",
      owner: "المسؤول",
      unassigned: "غير مُسنَد",
      notes: "ملاحظات",
      createLead: "إنشاء عميل محتمل",
      saveLead: "حفظ",
      leadCreated: "تم إنشاء العميل المحتمل.",
      saved: "تم الحفظ.",
    },
  },
  bookingRequests: {
    pageTitle: "طلبات الحجز",
    pageSubtitle: "طلبات الحجز الواردة من الموقع العام",
    searchPlaceholder: "بحث في طلبات الحجز…",
    allStatuses: "كل الحالات",
    allProductTypes: "كل أنواع المنتجات",
    noRequests: "لا توجد طلبات حجز.",
    reference: "المرجع",
    product: "المنتج",
    travelers: "المسافرون",
    adults: "البالغون",
    children: "الأطفال",
    preferredDate: "التاريخ المفضّل",
    returnDate: "تاريخ العودة",
    contact: "جهة الاتصال",
    status: "الحالة",
    statusUpdated: "تم تحديث الحالة.",
    convertToBooking: "تحويل إلى حجز",
    tabDetails: "التفاصيل",
    tabActivity: "النشاط",
    requestedBy: "مقدَّم من",
    travelDate: "تاريخ السفر",
    pax: "عدد الأشخاص",
    received: "تاريخ الاستلام",
    noMatch: "لا توجد طلبات حجز مطابقة لعوامل التصفية.",
    fullName: "الاسم الكامل",
    phone: "الهاتف",
    whatsapp: "واتساب",
    notes: "ملاحظات",
    requestedProduct: "المنتج المطلوب",
    type: "النوع",
    listing: "الإعلان",
    contactSection: "جهة الاتصال",
    customerRecord: "سجل العميل",
    travelDetails: "تفاصيل السفر",
    travellersValue: (adults, children) => `${adults} بالغ، ${children} طفل`,
    notesFromTraveler: "ملاحظات من المسافر",
    actions: "إجراءات",
    timeline: "الجدول الزمني",
    convertedTo: "تم التحويل إلى حجز",
    viewBooking: "عرض الحجز",
    rejectedOn: "رُفض بتاريخ",
    cancelledOn: "أُلغي بتاريخ",
    emailAction: "بريد إلكتروني",
    call: "اتصال",
    copyEmail: "نسخ البريد الإلكتروني",
    copyPhone: "نسخ رقم الهاتف",
    emailCopied: "تم نسخ البريد الإلكتروني",
    phoneCopied: "تم نسخ رقم الهاتف",
    markContacted: "تحديد كـ«تم التواصل»",
    revertToPending: "إعادة إلى قيد الانتظار",
    reject: "رفض",
    cancelAction: "إلغاء",
    reasonPlaceholder: "السبب (اختياري)…",
    confirmReject: "تأكيد الرفض",
    confirmCancel: "تأكيد الإلغاء",
    back: "رجوع",
    addNote: "+ إضافة ملاحظة",
    notePlaceholder: "مثال: تم الاتصال، ترك رسالة صوتية…",
    saveNote: "حفظ الملاحظة",
    markedContacted: "تم التحديد كـ«تم التواصل».",
    requestRejected: "تم رفض الطلب.",
    requestCancelled: "تم إلغاء الطلب.",
    bookingCreated: "تم إنشاء الحجز من الطلب.",
    noteAdded: "تمت إضافة الملاحظة.",
  },
  visaRequests: {
    pageTitle: "طلبات التأشيرة",
    pageSubtitle: "طلبات المساعدة في التأشيرة الواردة من الموقع العام",
    exportCsv: "تصدير CSV",
    searchPlaceholder: "بحث في طلبات التأشيرة…",
    allStatuses: "كل الحالات",
    noMatch: "لا توجد طلبات تأشيرة مطابقة لعوامل التصفية.",
    reference: "المرجع",
    requestedBy: "مقدَّم من",
    destination: "الوجهة",
    visaType: "نوع التأشيرة",
    pax: "عدد المسافرين",
    status: "الحالة",
    received: "تاريخ الاستلام",
    statusUpdated: "تم تحديث الحالة.",
    requestSection: "تفاصيل الطلب",
    destinationLabel: "الوجهة",
    nationalityLabel: "الجنسية",
    visaTypeLabel: "نوع التأشيرة",
    travelStartDate: "تاريخ بداية السفر",
    travelEndDate: "تاريخ نهاية السفر",
    bookingLinked: "الحجز المرتبط",
    contactSection: "جهة الاتصال",
    fullName: "الاسم الكامل",
    phone: "الهاتف",
    phoneFormatValidated: "تم التحقق من صيغة الرقم ✓",
    phoneVerified: "مُتحقَّق عبر رسالة نصية",
    phoneNotVerified: "غير مُتحقَّق عبر رسالة نصية",
    whatsapp: "واتساب",
    customerRecord: "سجل العميل",
    travelersSection: "المسافرون",
    travellerName: "الاسم",
    dateOfBirth: "تاريخ الميلاد",
    passportNumber: "رقم جواز السفر",
    passportIssuingCountry: "بلد إصدار الجواز",
    passportIssueDate: "تاريخ إصدار الجواز",
    passportExpiry: "تاريخ انتهاء الجواز",
    documentsSection: "المستندات المرفوعة",
    noDocuments: "لم يتم رفع أي مستندات.",
    documentDownload: "تنزيل المستند",
    documentCategoryPassport: "جواز السفر",
    documentCategoryImage: "صورة",
    documentCategoryPdf: "PDF",
    documentCategoryVisa: "تأشيرة",
    documentCategoryContract: "عقد",
    documentCategoryInsurance: "تأمين",
    documentCategoryNationalId: "بطاقة تعريف وطنية",
    documentCategoryVaccination: "تطعيم",
    documentCategoryOther: "أخرى",
    notesFromTraveler: "ملاحظات من المسافر",
    actions: "إجراءات",
    timeline: "الجدول الزمني",
    approvedOn: "تمت الموافقة بتاريخ",
    rejectedOn: "رُفض بتاريخ",
    cancelledOn: "أُلغي بتاريخ",
    emailAction: "بريد إلكتروني",
    call: "اتصال",
    copyEmail: "نسخ البريد الإلكتروني",
    copyPhone: "نسخ رقم الهاتف",
    emailCopied: "تم نسخ البريد الإلكتروني",
    phoneCopied: "تم نسخ رقم الهاتف",
    revertToPending: "إعادة إلى قيد الانتظار",
    reject: "رفض",
    cancelAction: "إلغاء",
    reasonPlaceholder: "السبب (اختياري)…",
    confirmReject: "تأكيد الرفض",
    confirmCancel: "تأكيد الإلغاء",
    back: "رجوع",
    addNote: "+ إضافة ملاحظة",
    notePlaceholder: "مثال: تم الاتصال، بانتظار مستند إضافي…",
    saveNote: "حفظ الملاحظة",
    requestRejected: "تم رفض الطلب.",
    requestCancelled: "تم إلغاء الطلب.",
    noteAdded: "تمت إضافة الملاحظة.",
  },
  customers: {
    pageTitle: "العملاء",
    addCustomer: "إضافة عميل",
    searchPlaceholder: "بحث في العملاء…",
    allTypes: "كل الأنواع",
    allSources: "كل المصادر",
    noMatch: "لا يوجد عملاء مطابقون لعوامل التصفية.",
    addFirst: "إضافة أول عميل",
    columnCustomer: "العميل",
    columnType: "النوع",
    columnContact: "التواصل",
    columnSource: "المصدر",
    statusUpdated: "تم تحديث الحالة.",
    deleteConfirmTitle: "حذف هذا العميل؟",
    deleteConfirmBody: "سيتم أرشفة ملاحظاته وسجله معه.",
    deleted: "تم حذف العميل.",
    detail: {
      backToList: "العملاء",
      noContactInfo: "لا توجد معلومات تواصل",
      tabProfile: "الملف الشخصي",
      tabContacts: "جهات الاتصال والعناوين",
      tabNotes: "الملاحظات",
      tabTimeline: "السجل الزمني",
      statNotes: "الملاحظات",
      statActivities: "الأنشطة",
      statLeads: "العملاء المحتملون",
      statCustomerFor: "عميل منذ",
      profileEmail: "البريد الإلكتروني",
      profilePhone: "الهاتف",
      profileNationality: "الجنسية",
      profilePassport: "جواز السفر",
      profileNotes: "ملاحظات",
    },
    contacts: {
      heading: "جهات الاتصال",
      addContact: "إضافة جهة اتصال",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      role: "الصفة",
      rolePlaceholder: "زوج/زوجة، مساعد…",
      primaryContact: "جهة الاتصال الأساسية",
      save: "حفظ",
      saving: "جارٍ الحفظ…",
      cancel: "إلغاء",
      noContacts: "لا توجد جهات اتصال إضافية.",
      noContactInfo: "لا توجد معلومات تواصل",
      editContactAria: "تعديل جهة الاتصال",
      deleteContactAria: "حذف جهة الاتصال",
      deleteConfirmTitle: "حذف جهة الاتصال هذه؟",
      deleted: "تم حذف جهة الاتصال.",
    },
    addresses: {
      heading: "العناوين",
      addAddress: "إضافة عنوان",
      label: "التسمية",
      labelPlaceholder: "المنزل، المكتب…",
      line1: "العنوان — السطر 1",
      line2: "العنوان — السطر 2",
      city: "المدينة",
      state: "الولاية / المنطقة",
      postalCode: "الرمز البريدي",
      country: "الدولة",
      primaryAddress: "العنوان الأساسي",
      save: "حفظ",
      saving: "جارٍ الحفظ…",
      cancel: "إلغاء",
      noAddresses: "لا توجد عناوين.",
      addressFallback: "عنوان",
      editAddressAria: "تعديل العنوان",
      deleteAddressAria: "حذف العنوان",
      deleteConfirmTitle: "حذف هذا العنوان؟",
      deleted: "تم حذف العنوان.",
    },
    notes: {
      writeNote: "اكتب ملاحظة…",
      addNote: "إضافة ملاحظة",
      saving: "جارٍ الحفظ…",
      noNotesYet: "لا توجد ملاحظات بعد.",
      deleteNoteAria: "حذف الملاحظة",
      added: "تمت إضافة الملاحظة.",
    },
    timeline: {
      noActivityYet: "لا يوجد نشاط بعد.",
    },
    tags: {
      noTags: "لا توجد وسوم",
      addTagPlaceholder: "إضافة وسم…",
      attachTagAria: "إرفاق الوسم",
      removeTagAria: (name) => `إزالة الوسم ${name}`,
    },
    form: {
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      customerType: "نوع العميل",
      leadSource: "مصدر العميل",
      unknown: "غير معروف",
      preferredContact: "طريقة التواصل المفضلة",
      dateOfBirth: "تاريخ الميلاد",
      nationality: "الجنسية",
      passportNumber: "رقم جواز السفر",
      passportExpiry: "تاريخ انتهاء جواز السفر",
      accountManager: "مسؤول الحساب",
      unassigned: "غير مُسنَد",
      generalNotes: "ملاحظات عامة",
      internal: "داخلي",
      saving: "جارٍ الحفظ…",
      createCustomer: "إنشاء عميل",
      saveProfile: "حفظ الملف الشخصي",
      possibleDuplicates: (count) =>
        count > 1 ? "تم العثور على تكرارات محتملة" : "تم العثور على تكرار محتمل",
      created: "تم إنشاء العميل.",
      saved: "تم الحفظ.",
    },
  },
  settings: {
    pageTitle: "الإعدادات",
    pageSubtitle: "محتوى الموقع العام لـ",
    yourPublicWebsite: "موقعكم العام",
    publicWebsiteIntro1: "يمكن لأي شخص زيارة",
    publicWebsiteIntro2: "دون تسجيل الدخول. كل ما يلي يتحكم بما يرونه — لا شيء في الموقع العام ثابت في الكود، فالحقل الفارغ هنا لا يظهر هناك ببساطة.",
    aboutAgency: "عن الوكالة",
    tagline: "الشعار التعريفي",
    taglinePlaceholder: "مثال: رحلتكم، شغفنا",
    description: "الوصف",
    descriptionPlaceholder: "أخبروا الزوار من أنتم وما الذي تقدمونه.",
    enableFrench: "تفعيل اللغة الفرنسية في الموقع العام",
    frenchNote: "العربية (أعلاه) هي اللغة الأساسية للموقع. هذه هي النسخ الفرنسية التي تظهر عند تبديل الزائر للغة.",
    taglineFr: "الشعار التعريفي (بالفرنسية)",
    taglineFrPlaceholder: "ex. Votre voyage, notre passion",
    descriptionFr: "الوصف (بالفرنسية)",
    descriptionFrPlaceholder: "Dites à vos visiteurs qui vous êtes et ce que vous proposez.",
    contactInfo: "معلومات التواصل",
    contactInfoIntro: "تظهر في الموقع العام وتُستخدم في تأكيدات الطلبات والحجوزات. اتركوا أي حقل فارغًا لإخفائه.",
    contactEmail: "البريد الإلكتروني للتواصل",
    contactPhone: "هاتف التواصل",
    whatsappNumber: "رقم واتساب",
    businessHoursAr: "ساعات العمل (بالعربية)",
    businessHoursFr: "ساعات العمل (بالفرنسية)",
    fallsBackToArabic: "اختياري — يعتمد على النسخة العربية إن تُرك فارغًا.",
    addressAr: "العنوان (بالعربية)",
    addressFr: "العنوان (بالفرنسية)",
    socialLinks: "روابط التواصل الاجتماعي",
    testimonials: "آراء العملاء",
    testimonialsIntro: "اقتباسات حقيقية من عملاء فقط — اكتبوا كل واحدة كما تريدون ظهورها، مع اسم المسافر (مثال: «رحلة رائعة، أنصح بها بشدة!» — سارة م.). يظهر هذا القسم في موقعكم العام فقط بعد إضافة رأي واحد على الأقل.",
    testimonialsAr: "آراء العملاء (بالعربية)",
    testimonialsFr: "آراء العملاء (بالفرنسية)",
    testimonialsFrNote: "اختياري — تُطابق قائمة العربية حسب الترتيب. إذا تركتم هذا فارغًا، تظهر الاقتباسات العربية للزوار الفرنسيين أيضًا.",
    savePublicSettings: "حفظ",
    security: {
      title: "كلمة المرور",
      intro: "غيّروا كلمة مرور حسابكم للدخول إلى لوحة التحكم.",
      currentPassword: "كلمة المرور الحالية",
      newPassword: "كلمة المرور الجديدة",
      confirmNewPassword: "تأكيد كلمة المرور الجديدة",
      savePassword: "تحديث كلمة المرور",
      saving: "جارٍ التحديث…",
      passwordUpdated: "تم تحديث كلمة المرور.",
    },
  },
  documents: {
    pageTitle: "المستندات",
    pageSubtitleCount: (count) =>
      `${count} ${count === 1 ? "مستند" : "مستندات"} — جوازات سفر، تأشيرات، عقود، وغيرها`,
    searchPlaceholder: "بحث في المستندات…",
    allCategories: "كل الفئات",
    uploadDocument: "رفع مستند",
    uploading: "جارٍ الرفع…",
    noDocuments: "لا توجد مستندات مطابقة لعوامل التصفية.",
    renameAction: "إعادة التسمية / التصنيف",
    replaceFileAction: "استبدال الملف",
    deleteDocumentAction: "حذف المستند",
    deleteConfirmTitle: "حذف هذا المستند؟",
    uploaded: "تم رفع المستند.",
    updated: "تم تحديث المستند.",
    replaced: "تم استبدال الملف.",
    deleted: "تم حذف المستند.",
    failedToSave: "فشل حفظ المستند.",
    failedToReplace: "فشل استبدال الملف.",
    uploadFailedPrefix: "فشل الرفع:",
  },
  search: {
    pageTitle: "البحث",
    pageSubtitle: "البحث في الباقات، الفنادق، الأنشطة، المرشدين، الموردين، والوجهات.",
    defaultPlaceholder: "بحث في الفنادق، الأنشطة، المرشدين…",
    ariaLabel: "بحث",
    typeToSearch: "اكتب حرفين على الأقل للبحث.",
    noResults: (query) => `لا توجد نتائج لـ «${query}».`,
  },
  guides: {
    pageTitle: "المرشدون السياحيون",
    addGuide: "إضافة مرشد",
    addFirstGuide: "إضافة أول مرشد",
    pageSubtitleCount: (count) =>
      `${count} ${count === 1 ? "مرشد" : "مرشدين"} في مساحة عملكم`,
    searchPlaceholder: "بحث في المرشدين أو اللغات…",
    noMatch: "لا يوجد مرشدون مطابقون لعوامل التصفية.",
    attachmentHint:
      "إضافة مرشد هنا لا تُظهره في الموقع العام تلقائيًا. لعرض مرشد لعملائكم، افتحوا الباقة المطلوبة ثم أضيفوه من تبويب «المخزون».",
    attachmentLinkLabel: "الذهاب إلى الباقات",
    attachedTo: "مرتبط بـ:",
    notAttached: "غير مرتبط بأي باقة — لن يظهر في الموقع العام.",
    columnGuide: "المرشد",
    columnLanguages: "اللغات",
    columnExperience: "الخبرة",
    columnDailyRate: "السعر اليومي",
    columnStatus: "الحالة",
    yearsAbbrev: "سنة",
    statusUpdated: "تم تحديث الحالة.",
    deleted: "تم حذف المرشد.",
    newPageTitle: "مرشد سياحي جديد",
    form: {
      guideName: "اسم المرشد",
      languages: "اللغات",
      languagesPlaceholder: "الإنجليزية، الفرنسية، العربية…",
      certifications: "الشهادات",
      certificationsPlaceholder: "رخصة سياحية وطنية، إسعافات أولية…",
      experienceYears: "سنوات الخبرة",
      dailyRate: "السعر اليومي",
      currency: "العملة",
      city: "المدينة",
      country: "الدولة",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      availabilityNotes: "ملاحظات التوفر",
      availabilityPlaceholder: "متاح في عطلات نهاية الأسبوع، خارج الموسم فقط…",
      internalNotes: "ملاحظات داخلية",
      notShownToCustomers: "لا تظهر للعملاء",
      saving: "جارٍ الحفظ…",
      createGuide: "إنشاء مرشد",
      save: "حفظ",
      created: "تم إنشاء المرشد.",
      saved: "تم الحفظ.",
    },
  },
  transport: {
    pageTitle: "النقل",
    addProvider: "إضافة مزود",
    addFirstProvider: "إضافة أول مزود",
    pageSubtitleCount: (count) => `${count} ${count === 1 ? "مزود" : "مزودين"} في مساحة عملكم`,
    searchPlaceholder: "بحث في المزودين…",
    allTypes: "كل الأنواع",
    noMatch: "لا يوجد مزودو نقل مطابقون لعوامل التصفية.",
    columnProvider: "المزود",
    columnType: "النوع",
    columnLocation: "الموقع",
    columnPhone: "الهاتف",
    columnStatus: "الحالة",
    statusUpdated: "تم تحديث الحالة.",
    deleted: "تم حذف المزود.",
    newPageTitle: "مزود نقل جديد",
    form: {
      companyName: "اسم الشركة",
      type: "النوع",
      city: "المدينة",
      country: "الدولة",
      contactName: "اسم جهة الاتصال",
      contactEmail: "البريد الإلكتروني لجهة الاتصال",
      contactPhone: "هاتف جهة الاتصال",
      website: "الموقع الإلكتروني",
      fleetNotes: "ملاحظات الأسطول",
      fleetNotesPlaceholder: "أنواع المركبات، السعة، الحالة…",
      pricingNotes: "ملاحظات التسعير",
      pricingNotesPlaceholder: "أسعار لكل نقلة / لكل يوم، تسعير موسمي…",
      internalNotes: "ملاحظات داخلية",
      notShownToCustomers: "لا تظهر للعملاء",
      saving: "جارٍ الحفظ…",
      createProvider: "إنشاء مزود",
      save: "حفظ",
      created: "تم إنشاء المزود.",
      saved: "تم الحفظ.",
    },
  },
  suppliers: {
    pageTitle: "الموردون",
    addSupplier: "إضافة مورد",
    addFirstSupplier: "إضافة أول مورد",
    pageSubtitleCount: (count) => `${count} ${count === 1 ? "مورد" : "موردين"} في مساحة عملكم`,
    statTotalSuppliers: "إجمالي الموردين",
    statActive: "نشط",
    statAvgRating: "متوسط التقييم",
    statTopCategory: "الفئة الأكثر",
    searchPlaceholder: "بحث في الموردين…",
    allTypes: "كل الأنواع",
    noMatch: "لا يوجد موردون مطابقون لعوامل التصفية.",
    columnSupplier: "المورد",
    columnType: "النوع",
    columnLocation: "الموقع",
    columnRating: "التقييم",
    columnStatus: "الحالة",
    statusUpdated: "تم تحديث الحالة.",
    deleted: "تم حذف المورد.",
    newPageTitle: "مورد جديد",
    tabDetails: "التفاصيل",
    tabContacts: "جهات الاتصال",
    tabDocuments: "المستندات",
    form: {
      supplierName: "اسم المورد",
      type: "النوع",
      internalRating: "التقييم الداخلي",
      unrated: "غير مقيَّم",
      contactName: "اسم جهة الاتصال",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      website: "الموقع الإلكتروني",
      address: "العنوان",
      city: "المدينة",
      country: "الدولة",
      notes: "ملاحظات",
      saving: "جارٍ الحفظ…",
      createSupplier: "إنشاء مورد",
      save: "حفظ",
      created: "تم إنشاء المورد.",
      saved: "تم الحفظ.",
    },
    contacts: {
      heading: "جهات الاتصال",
      subtitle: "الأشخاص الذين تتعاملون معهم لدى هذا المورد.",
      addContact: "إضافة جهة اتصال",
      name: "الاسم",
      role: "الصفة",
      rolePlaceholder: "مدير الحجوزات…",
      primaryContact: "جهة الاتصال الأساسية",
      save: "حفظ",
      saving: "جارٍ الحفظ…",
      cancel: "إلغاء",
      noContacts: "لا توجد جهات اتصال بعد.",
      noContactInfo: "لا توجد معلومات تواصل",
      editContactAria: "تعديل جهة الاتصال",
      deleteContactAria: "حذف جهة الاتصال",
      deleteConfirmTitle: "حذف جهة الاتصال هذه؟",
      deleted: "تم حذف جهة الاتصال.",
    },
    documents: {
      heading: "المستندات والعقود",
      subtitle: "احفظوا العقود والملفات الأخرى (PDF أو صورة، حتى 16 ميغابايت).",
      kindDocument: "مستند",
      kindContract: "عقد",
      upload: "رفع",
      uploading: "جارٍ الرفع…",
      noDocuments: "لا توجد مستندات بعد.",
      added: "تمت إضافة المستند.",
      removed: "تمت إزالة المستند.",
      failedToSave: "فشل حفظ المستند.",
      uploadFailedPrefix: "فشل الرفع:",
    },
  },
  activities: {
    pageTitle: "الأنشطة",
    pageSubtitleIntro:
      "جولة أو رحلة واحدة — بضع ساعات، وليست رحلة متعددة الأيام. استخدموا هذا للتجارب الفردية التي يمكن للعميل إضافتها بمفرده، سواء حجز باقة أم لا.",
    pageSubtitleCount: (count) => `${count} ${count === 1 ? "نشاط" : "أنشطة"} في مساحة عملكم.`,
    addActivity: "إضافة نشاط",
    addFirstActivity: "إضافة أول نشاط",
    searchPlaceholder: "بحث في الأنشطة…",
    noMatch: "لا توجد أنشطة مطابقة لعوامل التصفية.",
    columnActivity: "النشاط",
    columnCategory: "الفئة",
    columnDuration: "المدة",
    columnPrice: "السعر",
    columnStatus: "الحالة",
    minutesAbbrev: "د",
    hoursAbbrev: "س",
    statusUpdated: "تم تحديث الحالة.",
    deleted: "تم حذف النشاط.",
    newPageTitle: "نشاط جديد",
    viewOnPublicSite: "عرض في الموقع العام",
    notLiveYet: "غير منشور بعد — فعّلوه من القائمة لعرضه.",
    tabDetails: "التفاصيل",
    tabMedia: "الوسائط",
    form: {
      nameAr: "الاسم",
      urlSlug: "رابط URL",
      featured: "نشاط مميز",
      featuredDescription: "تُعرض الأنشطة المميزة بشكل بارز في موقع الوكالة العام.",
      categoryAr: "الفئة",
      durationMinutes: "المدة (بالدقائق)",
      cityAr: "المدينة",
      countryAr: "الدولة",
      meetingPointAr: "نقطة اللقاء",
      descriptionAr: "الوصف",
      includedAr: "المشمول",
      excludedAr: "غير المشمول",
      supplier: "المورد",
      noSupplier: "بدون مورد",
      internalCost: "التكلفة الداخلية",
      sellingPrice: "سعر البيع",
      currency: "العملة",
      saving: "جارٍ الحفظ…",
      createActivity: "إنشاء نشاط",
      saveDetails: "حفظ التفاصيل",
      created: "تم إنشاء النشاط كغير نشط. فعّلوه من القائمة ليظهر في الموقع العام.",
      saved: "تم الحفظ.",
      cancel: "إلغاء",
      recommended: "موصى به",
      pictureRequired: "أضيفوا صورة قبل المتابعة.",
      fixErrorsBeforeSubmitting: "يوجد أخطاء يجب تصحيحها قبل الإنشاء — تمت إعادتكم إلى الخطوة المعنية.",
      previous: "السابق",
      next: "التالي",
      stepIndicator: (step, total) => `الخطوة ${step} من ${total}`,
      reviewCoverImage: "صورة الغلاف",
      reviewGalleryCount: (count) => `${count} ${count === 1 ? "صورة" : "صور"} في المعرض`,
      reviewNoMedia: "لم تتم إضافة صور بعد.",
      notSet: "غير محدد",
      sections: {
        general: "معلومات عامة",
        generalHint: "الاسم يظهر كعنوان صفحة النشاط العامة وفي بطاقات القوائم.",
        location: "الموقع والتوقيت",
        locationHint: "تظهر أسفل العنوان مباشرة في صفحة النشاط العامة.",
        description: "الوصف",
        descriptionHint: "يظهر في الجزء الرئيسي من صفحة النشاط العامة.",
        inclusions: "المشمول وغير المشمول",
        inclusionsHint: "يظهر في قسم «المشمول وغير المشمول» بصفحة النشاط العامة.",
        pricing: "التسعير والمورد",
        pricingHint: "سعر البيع يظهر للزوار كسعر النشاط؛ المورد والتكلفة الداخلية للاستخدام الداخلي فقط ولا يظهران في الموقع العام.",
        media: "الوسائط",
        mediaHint: "تظهر في أعلى صفحة النشاط العامة وفي معرض الصور.",
        review: "المراجعة",
        reviewHint: "راجعوا كل شيء قبل الحفظ. يمكنكم العودة لتعديل أي خطوة.",
      },
    },
  },
  destinations: {
    pageTitle: "الوجهات",
    pageSubtitleIntro:
      "ليست شيئًا يحجزه العميل — صفحة دليل ملهمة لمكان ما (صور، أبرز المعالم، الجذب السياحي) تربط بما تقدمونه هناك من باقات وفنادق ورحلات وأنشطة.",
    pageSubtitleCount: (count) => `${count} ${count === 1 ? "وجهة" : "وجهات"} في مساحة عملكم.`,
    addDestination: "إضافة وجهة",
    addFirstDestination: "إضافة أول وجهة",
    searchPlaceholder: "بحث في الوجهات…",
    noMatch: "لا توجد وجهات مطابقة لعوامل التصفية.",
    columnDestination: "الوجهة",
    columnCountry: "الدولة",
    columnRegion: "المنطقة",
    columnStatus: "الحالة",
    statusUpdated: "تم تحديث الحالة.",
    deleted: "تم حذف الوجهة.",
    newPageTitle: "وجهة جديدة",
    viewOnPublicSite: "عرض في الموقع العام",
    notLiveYet: "غير منشورة بعد — فعّلوها من القائمة لعرضها.",
    tabDetails: "التفاصيل",
    tabMedia: "الوسائط",
    tabSeo: "تحسين محركات البحث",
    heroImageTitle: "الصورة الرئيسية",
    heroImageDescription: "صورة بانر كبيرة للوجهة. الحجم الموصى به: 1600×600 بكسل.",
    form: {
      nameAr: "الاسم",
      urlSlug: "رابط URL",
      featured: "وجهة مميزة",
      featuredDescription: "تُعرض الوجهات المميزة بشكل بارز في موقع الوكالة العام.",
      countryAr: "الدولة",
      regionAr: "المنطقة",
      cityAr: "المدينة",
      descriptionAr: "الوصف",
      attractionsAr: "أبرز المعالم",
      saving: "جارٍ الحفظ…",
      createDestination: "إنشاء وجهة",
      saveDetails: "حفظ التفاصيل",
      created: "تم إنشاء الوجهة كغير نشطة. فعّلوها من القائمة لتظهر في الموقع العام.",
      saved: "تم الحفظ.",
      cancel: "إلغاء",
      recommended: "موصى به",
      pictureRequired: "أضيفوا صورة قبل المتابعة.",
      fixErrorsBeforeSubmitting: "يوجد أخطاء يجب تصحيحها قبل الإنشاء — تمت إعادتكم إلى الخطوة المعنية.",
      previous: "السابق",
      next: "التالي",
      stepIndicator: (step, total) => `الخطوة ${step} من ${total}`,
      reviewCoverImage: "صورة الغلاف",
      reviewGalleryCount: (count) => `${count} ${count === 1 ? "صورة" : "صور"} في المعرض`,
      reviewNoMedia: "لم تتم إضافة صور بعد.",
      notSet: "غير محدد",
      sections: {
        general: "معلومات عامة",
        generalHint: "يظهران كعنوان ووصف صفحة الوجهة العامة.",
        description: "الوصف",
        location: "الموقع",
        locationHint: "تظهر في صفحة الوجهة العامة.",
        content: "المحتوى",
        contentHint: "تظهر في قسم «أبرز المعالم» بصفحة الوجهة العامة.",
        media: "الوسائط",
        mediaHint: "تظهر كصورة بانر أعلى صفحة الوجهة العامة وفي معرض الصور.",
        review: "المراجعة",
        reviewHint: "راجعوا كل شيء قبل الإنشاء.",
      },
    },
    seo: {
      seoTitleAr: "عنوان تحسين محركات البحث",
      seoDescriptionAr: "وصف تحسين محركات البحث",
      charsCount: (count) => `${count} حرفًا`,
      searchPreview: "معاينة نتيجة البحث",
      addSeoDescriptionPlaceholder: "أضيفوا وصف تحسين محركات البحث للتحكم بهذا المقتطف…",
      saving: "جارٍ الحفظ…",
      saveSeo: "حفظ تحسين محركات البحث",
      seoSaved: "تم حفظ تحسين محركات البحث.",
    },
  },
  hotels: {
    pageTitle: "الفنادق",
    pageSubtitleIntro:
      "مكان إقامة قائم بذاته، يمكن حجزه بمفرده دون باقة كاملة. استخدموه للعملاء الذين يحتاجون غرفة فقط — يمكن للباقة أن تشير إلى أحد هذه الفنادق كجزء من برنامج رحلتها.",
    pageSubtitleCount: (count) => `${count} ${count === 1 ? "فندق" : "فنادق"} في مساحة عملكم.`,
    addHotel: "إضافة فندق",
    addFirstHotel: "إضافة أول فندق",
    searchPlaceholder: "بحث في الفنادق…",
    allCategories: "كل الفئات",
    allStars: "كل التصنيفات",
    starsLabel: (count) => `${count} ${count === 1 ? "نجمة" : "نجوم"}`,
    noMatch: "لا توجد فنادق مطابقة لعوامل التصفية.",
    columnHotel: "الفندق",
    columnCategory: "الفئة",
    columnLocation: "الموقع",
    columnRooms: "الغرف",
    columnStatus: "الحالة",
    statusUpdated: "تم تحديث الحالة.",
    deleted: "تم حذف الفندق.",
    newPageTitle: "فندق جديد",
    lastUpdated: (date) => `آخر تحديث ${date}`,
    viewOnPublicSite: "عرض في الموقع العام",
    notLiveYet: "غير منشور بعد — فعّلوه من القائمة لعرضه.",
    tabDetails: "التفاصيل",
    tabMedia: "الوسائط",
    tabRooms: "أنواع الغرف",
    coverImageDescription: "الصورة الأساسية المعروضة في القوائم. الحجم الموصى به: 1200×630 بكسل.",
    galleryDescription: "حتى 10 صور للعقار.",
    form: {
      nameAr: "الاسم",
      urlSlug: "رابط URL",
      featured: "فندق مميز",
      featuredDescription: "تُعرض الفنادق المميزة بشكل بارز في موقع الوكالة العام.",
      category: "الفئة",
      stars: "النجوم",
      cityAr: "المدينة",
      countryAr: "الدولة",
      addressAr: "العنوان",
      latitude: "خط العرض",
      longitude: "خط الطول",
      descriptionAr: "الوصف",
      amenitiesAr: "المرافق",
      contactName: "اسم جهة الاتصال",
      contactEmail: "البريد الإلكتروني لجهة الاتصال",
      contactPhone: "هاتف جهة الاتصال",
      website: "الموقع الإلكتروني",
      internalNotes: "ملاحظات داخلية",
      notShownToCustomers: "لا تظهر للعملاء",
      saving: "جارٍ الحفظ…",
      createHotel: "إنشاء فندق",
      saveDetails: "حفظ التفاصيل",
      created: "تم إنشاء الفندق كغير نشط. فعّلوه من القائمة ليظهر في الموقع العام.",
      saved: "تم حفظ الفندق.",
      cancel: "إلغاء",
      recommended: "موصى به",
      pictureRequired: "أضيفوا صورة قبل المتابعة.",
      fixErrorsBeforeSubmitting: "يوجد أخطاء يجب تصحيحها قبل الإنشاء — تمت إعادتكم إلى الخطوة المعنية.",
      previous: "السابق",
      next: "التالي",
      stepIndicator: (step, total) => `الخطوة ${step} من ${total}`,
      reviewCoverImage: "صورة الغلاف",
      reviewGalleryCount: (count) => `${count} ${count === 1 ? "صورة" : "صور"} في المعرض`,
      reviewNoMedia: "لم تتم إضافة صور بعد.",
      notSet: "غير محدد",
      sections: {
        general: "معلومات عامة",
        generalHint: "يظهران كعنوان ووصف صفحة الفندق العامة.",
        description: "الوصف",
        location: "الموقع",
        locationHint: "تظهر في صفحة الفندق العامة وعلى الخريطة.",
        details: "التفاصيل",
        detailsHint: "تظهر كنجوم وقائمة مرافق في صفحة الفندق العامة.",
        contact: "التواصل",
        contactHint: "للاستخدام الداخلي فقط — لا تظهر في الموقع العام.",
        media: "الوسائط",
        mediaHint: "تظهر في أعلى صفحة الفندق العامة وفي معرض الصور.",
        review: "المراجعة",
        reviewHint: "راجعوا كل شيء قبل الإنشاء.",
      },
    },
    rooms: {
      heading: "أنواع الغرف",
      subtitle: "فئات الغرف والسعة والتسعير لهذا الفندق.",
      addRoomType: "إضافة نوع غرفة",
      noRoomTypes: "لا توجد أنواع غرف بعد.",
      save: "حفظ",
      cancel: "إلغاء",
      saving: "جارٍ الحفظ…",
      deleteConfirmTitle: "حذف نوع الغرفة هذا؟",
      deleted: "تم حذف نوع الغرفة.",
      editAria: "تعديل",
      deleteAria: "حذف",
      type: "النوع",
      nameAr: "الاسم (بالعربية)",
      nameFr: "الاسم (بالفرنسية)",
      optionalFallsBackAr: "اختياري — يعتمد على النسخة العربية إن تُرك فارغًا.",
      capacity: "السعة",
      beds: "الأسرّة",
      maxOccupancy: "الحد الأقصى للإشغال",
      currency: "العملة",
      basePrice: "السعر الأساسي",
      perNight: "لليلة",
      internalCost: "التكلفة الداخلية",
      net: "صافي",
      photos: "الصور",
      notesAr: "ملاحظات (بالعربية)",
      notesFr: "ملاحظات (بالفرنسية)",
      optional: "اختياري",
      pax: "شخص",
      bedsAbbrev: (count) => `${count} ${count === 1 ? "سرير" : "أسرّة"}`,
      perNightSuffix: "/ليلة",
    },
  },
  flights: {
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
    viewOnPublicSite: "عرض في الموقع العام",
    notLiveYet: "لم تُنشر بعد — انشروها من تبويب «الحالة» لعرضها.",
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
  },
  packages: {
    pageTitle: "الباقات",
    pageSubtitleIntro:
      "رحلة متكاملة مجمّعة — إقامة ونقل وأنشطة تُباع معًا كمنتج واحد بسعر موحّد وبرنامج رحلة خاص به. استخدموها للرحلات متعددة الأيام التي تُباع كعرض واحد، وليس لحجز رحلة جوية أو غرفة فقط (راجعوا الرحلات/الفنادق لذلك).",
    pageSubtitleCount: (count) => `${count} ${count === 1 ? "باقة" : "باقات"} في مساحة عملكم.`,
    newPackage: "باقة جديدة",
    newPageSubtitle: "ابدأوا بناء باقة سفر جديدة. يمكنكم نشرها عند اكتمالها.",
    lastUpdated: (date) => `آخر تحديث ${date}`,
    viewOnPublicSite: "عرض في الموقع العام",
    notLiveYet: "لم تُنشر بعد — انشروها لعرضها.",
    createFirstPackage: "إنشاء أول باقة",
    searchPlaceholder: "بحث في الباقات…",
    allStatuses: "كل الحالات",
    statusDraft: "مسودة",
    statusPublished: "منشور",
    statusArchived: "مؤرشف",
    noMatch: "لا توجد باقات مطابقة لعوامل التصفية.",
    columnPackage: "الباقة",
    columnStatus: "الحالة",
    columnDestination: "الوجهة",
    columnDuration: "المدة",
    columnFromPrice: "السعر ابتداءً من",
    columnUpdated: "آخر تحديث",
    daysAbbrev: "أيام",
    nightsAbbrev: "ليالٍ",
    statusUpdated: "تم تحديث الحالة.",
    deleted: "تم حذف الباقة.",
    duplicated: "تم نسخ الباقة.",
    duplicate: "نسخ",
    publish: "نشر",
    unpublish: "إلغاء النشر",
    archive: "أرشفة",
    restoreToDraft: "إعادة إلى مسودة",
    statusSectionHeading: "الحالة",
    statusSectionSubtitle: "التحكم بظهور هذه الباقة.",
    dangerZoneHeading: "منطقة الخطر",
    dangerZoneSubtitle: "حذف الباقة نهائي ولا يمكن التراجع عنه.",
    deletePackage: "حذف الباقة",
    tabDetails: "التفاصيل",
    tabBuilder: "المحتوى",
    tabMedia: "الوسائط",
    tabSeo: "تحسين محركات البحث",
    tabItinerary: "برنامج الرحلة",
    tabInventory: "المخزون",
    coverImageDescription: "تُعرض أعلى صفحة الباقة. الحجم الموصى به: 1200×630 بكسل.",
    galleryDescription: "حتى 10 صور إضافية. تظهر في صفحة تفاصيل الباقة.",
    noItineraryConfigured: "لم يتم إعداد برنامج رحلة بعد.",
    dayLabel: "اليوم",
    noSeoConfigured: "لم يتم إعداد إعدادات تحسين محركات البحث.",
    yes: "نعم",
    detailsForm: {
      nameAr: "الاسم",
      urlSlug: "رابط URL",
      shortDescriptionAr: "وصف مختصر",
      maxChars: "الحد الأقصى 300 حرف.",
      fullDescriptionAr: "الوصف الكامل",
      destinationAr: "الوجهة",
      countryAr: "الدولة",
      durationDays: "المدة (بالأيام)",
      durationNights: "المدة (بالليالي)",
      categoryAr: "الفئة",
      difficulty: "مستوى الصعوبة",
      selectDifficulty: "اختر مستوى الصعوبة",
      difficultyEasy: "سهل",
      difficultyModerate: "متوسط",
      difficultyChallenging: "صعب",
      difficultyExtreme: "قاسٍ جدًا",
      internalCost: "التكلفة الداخلية",
      notShownPublicly: "لا تظهر للعامة.",
      fromPrice: "السعر ابتداءً من",
      fromPriceHint: "يظهر في الموقع العام كسعر ابتدائي — يُحدَّد السعر النهائي مع المسافر.",
      currency: "العملة",
      featured: "باقة مميزة",
      featuredDescription: "تُعرض الباقات المميزة بشكل بارز في موقع الوكالة العام.",
      saving: "جارٍ الحفظ…",
      saveDetails: "حفظ التفاصيل",
      saved: "تم حفظ التفاصيل.",
    },
    builderForm: {
      highlightsAr: "أبرز المحطات",
      includedAr: "المشمول",
      excludedAr: "غير المشمول",
      importantNotesAr: "ملاحظات مهمة",
      whatToBringAr: "ما يجب إحضاره",
      meetingPointAr: "نقطة اللقاء",
      cancellationPolicyAr: "سياسة الإلغاء",
      saving: "جارٍ الحفظ…",
      saveBuilderContent: "حفظ المحتوى",
      saved: "تم حفظ المحتوى.",
    },
    seoForm: {
      seoTitleAr: "عنوان تحسين محركات البحث",
      charsCount: (count) => `${count} حرفًا — يظهر في نتائج محركات البحث.`,
      seoDescriptionAr: "وصف تحسين محركات البحث",
      previewAr: "معاينة",
      noDescription: "لا يوجد وصف.",
      saving: "جارٍ الحفظ…",
      saveSeo: "حفظ تحسين محركات البحث",
      saved: "تم حفظ إعدادات تحسين محركات البحث.",
    },
    createForm: {
      name: "الاسم",
      description: "الوصف",
      urlSlug: "رابط URL",
      creating: "جارٍ الإنشاء…",
      createPackage: "إنشاء باقة",
      cancel: "إلغاء",
      created: "تم إنشاء الباقة.",
    },
    readOnly: {
      name: "الاسم",
      slug: "الرابط",
      shortDescription: "وصف مختصر",
      description: "الوصف",
      destination: "الوجهة",
      country: "الدولة",
      duration: "المدة",
      category: "الفئة",
      difficulty: "الصعوبة",
      featured: "مميزة",
      highlights: "أبرز المحطات",
      included: "المشمول",
      excluded: "غير المشمول",
      importantNotes: "ملاحظات مهمة",
      whatToBring: "ما يجب إحضاره",
      meetingPoint: "نقطة اللقاء",
      cancellationPolicy: "سياسة الإلغاء",
      seoTitle: "عنوان تحسين محركات البحث",
      seoDescription: "وصف تحسين محركات البحث",
    },
  },
  itinerary: {
    noItineraryYet: "لا يوجد برنامج رحلة بعد",
    addFirstDay: "إضافة اليوم 1",
    addDay: (n) => `إضافة اليوم ${n}`,
    dayLabel: "اليوم",
    failedToReorderDays: "فشل إعادة ترتيب الأيام.",
    failedToReorderActivities: "فشل إعادة ترتيب الأنشطة.",
    dragToReorderDay: "اسحب لإعادة ترتيب اليوم",
    dragToReorderActivity: "اسحب لإعادة ترتيب النشاط",
    expand: "توسيع",
    collapse: "طي",
    editDay: "تعديل اليوم",
    deleteDay: "حذف اليوم",
    deleteDayConfirmTitle: "حذف هذا اليوم وكل أنشطته؟",
    failedToDeleteDay: "فشل حذف اليوم.",
    addActivity: "إضافة نشاط",
    editActivity: "تعديل النشاط",
    deleteActivity: "حذف النشاط",
    deleteActivityConfirmTitle: "حذف هذا النشاط؟",
    failedToDeleteActivity: "فشل حذف النشاط.",
    breakfastAbbrev: "فطور",
    lunchAbbrev: "غداء",
    dinnerAbbrev: "عشاء",
    dayForm: {
      titleAr: "عنوان اليوم (بالعربية)",
      titleFr: "عنوان اليوم (بالفرنسية)",
      optionalFallsBackAr: "اختياري — يعتمد على النسخة العربية إن تُرك فارغًا.",
      descriptionAr: "الوصف (بالعربية)",
      descriptionFr: "الوصف (بالفرنسية)",
      optional: "اختياري",
      breakfastAr: "الفطور (بالعربية)",
      lunchAr: "الغداء (بالعربية)",
      dinnerAr: "العشاء (بالعربية)",
      breakfastFr: "الفطور (بالفرنسية)",
      lunchFr: "الغداء (بالفرنسية)",
      dinnerFr: "العشاء (بالفرنسية)",
      transferNotesAr: "ملاحظات النقل (بالعربية)",
      transferNotesFr: "ملاحظات النقل (بالفرنسية)",
      accommodationAr: "الإقامة (بالعربية)",
      accommodationFr: "الإقامة (بالفرنسية)",
      internalNotes: "ملاحظات داخلية",
      saving: "جارٍ الحفظ…",
      saveDay: "حفظ اليوم",
      cancel: "إلغاء",
    },
    activityForm: {
      titleAr: "النشاط (بالعربية)",
      titleFr: "النشاط (بالفرنسية)",
      optionalFallsBackAr: "اختياري — يعتمد على النسخة العربية إن تُرك فارغًا.",
      descriptionAr: "الوصف (بالعربية)",
      descriptionFr: "الوصف (بالفرنسية)",
      optional: "اختياري",
      duration: "المدة",
      durationHint: "بالدقائق، اختياري",
      saving: "جارٍ الحفظ…",
      save: "إضافة نشاط",
      cancel: "إلغاء",
    },
  },
  bookings: {
    pageTitle: "الحجوزات",
    statsSummary: (total, active, upcoming) => `${total} إجمالي · ${active} نشط · ${upcoming} قادم`,
    newBooking: "حجز جديد",
    statActiveRevenue: "الإيرادات النشطة",
    statConfirmed: "مؤكد",
    statInProgress: "قيد التنفيذ",
    statCompleted: "مكتمل",
    searchPlaceholder: "بحث بالمرجع أو اسم العميل…",
    allStatuses: "كل الحالات",
    allAgents: "كل الوكلاء",
    noMatch: "لا توجد حجوزات مطابقة لعوامل التصفية.",
    createFirstBooking: "إنشاء أول حجز",
    columnReference: "المرجع",
    columnCustomer: "العميل",
    columnTravelDates: "تواريخ السفر",
    columnPax: "عدد الأشخاص",
    columnStatus: "الحالة",
    columnTotal: "الإجمالي",
    backToList: "الحجوزات",
    newPageTitle: "حجز جديد",
    newPageSubtitle: "أنشئوا رأس الحجز، ثم أضيفوا البنود في صفحة الحجز.",
    needCustomerFirst: "تحتاجون إلى عميل واحد على الأقل قبل إنشاء حجز.",
    addCustomer: "إضافة عميل",
    cancelledOn: (date) => `أُلغي بتاريخ ${date}`,
    lineItems: "البنود",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    tax: "الضريبة",
    total: "الإجمالي",
    travellers: "المسافرون",
    supplierConfirmations: "تأكيدات الموردين",
    vouchers: "القسائم",
    customerFacingNotes: "ملاحظات للعميل",
    internalNotes: "ملاحظات داخلية",
    detailsHeading: "التفاصيل",
    travelStart: "بداية السفر",
    travelEnd: "نهاية السفر",
    travellersValue: (adults, children) => `${adults} بالغ، ${children} طفل`,
    agent: "الوكيل",
    unassigned: "غير مُسنَد",
    created: "تاريخ الإنشاء",
    statusHeading: "الحالة",
    timeline: "الجدول الزمني",
    statusActions: {
      markStatus: (status) => `تحديد كـ«${status}»`,
      cancelBooking: "إلغاء الحجز",
      reasonPlaceholder: "السبب (اختياري)…",
      confirmCancellation: "تأكيد الإلغاء",
      keepBooking: "الاحتفاظ بالحجز",
      assignedAgent: "الوكيل المُسنَد",
      statusUpdatedTo: (status) => `تم تحديد الحجز كـ«${status}».`,
      cancelled: "تم إلغاء الحجز.",
      agentUpdated: "تم تحديث الوكيل.",
    },
    itemsEditor: {
      columnType: "النوع",
      columnDescription: "الوصف",
      columnQty: "الكمية",
      columnUnit: "سعر الوحدة",
      columnAmount: "المبلغ",
      editItemAria: "تعديل البند",
      deleteItemAria: "حذف البند",
      noItemsYet: "لا توجد بنود بعد. أضيفوا فنادق، نقل، أنشطة والمزيد لبناء الحجز.",
      type: "النوع",
      description: "الوصف",
      descriptionPlaceholder: "3 ليالٍ — فندق هيلتون مراكش، غرفة مزدوجة",
      quantity: "الكمية",
      unitPrice: "سعر الوحدة",
      notesOptional: "ملاحظات (اختياري)",
      lineAmount: "مبلغ البند:",
      saveItem: "حفظ البند",
      addItem: "إضافة بند",
      cancel: "إلغاء",
      invalidItem: "بند غير صالح.",
      itemUpdated: "تم تحديث البند.",
      itemAdded: "تمت إضافة البند.",
      itemRemoved: "تمت إزالة البند.",
    },
    form: {
      customer: "العميل",
      selectCustomer: "اختر عميلًا",
      packageOptional: "الباقة (اختياري)",
      noPackage: "بدون باقة",
      travelStart: "بداية السفر",
      travelEnd: "نهاية السفر",
      adults: "البالغون",
      children: "الأطفال",
      agent: "الوكيل",
      unassigned: "غير مُسنَد",
      currency: "العملة",
      discount: "الخصم",
      tax: "الضريبة",
      customerFacingNotes: "ملاحظات للعميل",
      internalNotes: "ملاحظات داخلية",
      saving: "جارٍ الحفظ…",
      createBooking: "إنشاء حجز",
      saveBooking: "حفظ الحجز",
      created: "تم إنشاء الحجز.",
      saved: "تم الحفظ.",
    },
  },
  confirmations: {
    addLineItemsHint: "أضيفوا عناصر إلى الحجز لتتبّع تأكيدات الموردين.",
    notRequested: "لم يُطلب",
    request: "طلب تأكيد",
    reRequest: "إعادة الطلب",
    confirm: "تأكيد",
    reject: "رفض",
    linkSupplierPlaceholder: "ربط بمورّد (اختياري)",
    noSupplierRecord: "بدون سجل مورّد",
    supplierNamePlaceholder: "اسم المورّد (اختياري)",
    sendRequest: "إرسال الطلب",
    confirmationRequested: "تم إرسال طلب التأكيد.",
    confirmationNumberPlaceholder: "رقم التأكيد",
    saveConfirmation: "حفظ التأكيد",
    markedConfirmed: "تم تحديده كمؤكد.",
    reasonPlaceholder: "السبب (اختياري)",
    markRejected: "تحديد كمرفوض",
    markedRejected: "تم تحديده كمرفوض.",
    statusPending: "قيد الانتظار",
    statusConfirmed: "مؤكد",
    statusRejected: "مرفوض",
  },
  quotes: {
    pageTitle: "عروض الأسعار",
    statsSummary: (total, sent, acceptanceRate) =>
      `${total} إجمالي · ${sent} مُرسَل · ${acceptanceRate}% نسبة القبول`,
    newQuote: "عرض سعر جديد",
    statOpenValue: "القيمة المفتوحة",
    statSent: "مُرسَل",
    statAccepted: "مقبول",
    statConverted: "محوَّل",
    searchPlaceholder: "بحث بالمرجع أو اسم العميل…",
    allStatuses: "كل الحالات",
    allAgents: "كل الوكلاء",
    noMatch: "لا توجد عروض أسعار مطابقة لعوامل التصفية.",
    createFirstQuote: "إنشاء أول عرض سعر",
    columnReference: "المرجع",
    columnCustomer: "العميل",
    columnValidUntil: "صالح حتى",
    columnStatus: "الحالة",
    columnTotal: "الإجمالي",
    viewBooking: "عرض الحجز",
    backToList: "عروض الأسعار",
    newPageTitle: "عرض سعر جديد",
    newPageSubtitle:
      "أنشئوا رأس العرض، ثم أضيفوا البنود — التي تُسعَّر تلقائيًا من مخزونكم — في صفحة العرض.",
    needCustomerFirst: "تحتاجون إلى عميل واحد على الأقل قبل إنشاء عرض سعر.",
    addCustomer: "إضافة عميل",
    editQuoteHeader: "تعديل رأس العرض",
    editQuotePageTitle: "تعديل عرض السعر",
    convertedOn: (date) => `تم التحويل إلى حجز بتاريخ ${date}`,
    declinedOn: (date) => `رُفض بتاريخ ${date}`,
    expiredNotice: (date) =>
      `تجاوز هذا العرض تاريخ صلاحيته (${date}). حدّدوه كمنتهي الصلاحية أو راجعوه وأعيدوا إرساله.`,
    lineItems: "البنود",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    tax: "الضريبة",
    total: "الإجمالي",
    customerFacingNotes: "ملاحظات للعميل",
    termsAndConditions: "الشروط والأحكام",
    internalNotes: "ملاحظات داخلية",
    detailsHeading: "التفاصيل",
    validUntil: "صالح حتى",
    travelStart: "بداية السفر",
    travelEnd: "نهاية السفر",
    travellersLabel: "المسافرون",
    travellersValue: (adults, children) => `${adults} بالغ، ${children} طفل`,
    agent: "الوكيل",
    unassigned: "غير مُسنَد",
    created: "تاريخ الإنشاء",
    statusHeading: "الحالة",
    timeline: "الجدول الزمني",
    statusActions: {
      convertToBooking: "تحويل إلى حجز",
      markStatus: (status) => `تحديد كـ«${status}»`,
      decline: "رفض",
      reasonPlaceholder: "السبب (اختياري)…",
      confirmDecline: "تأكيد الرفض",
      keepQuote: "الاحتفاظ بالعرض",
      assignedAgent: "الوكيل المُسنَد",
      statusUpdatedTo: (status) => `تم تحديد العرض كـ«${status}».`,
      declined: "تم رفض العرض.",
      bookingCreated: "تم إنشاء حجز من العرض.",
      agentUpdated: "تم تحديث الوكيل.",
    },
    itemsEditor: {
      columnType: "النوع",
      columnDescription: "الوصف",
      columnQty: "الكمية",
      columnUnit: "سعر الوحدة",
      columnAmount: "المبلغ",
      editItemAria: "تعديل البند",
      deleteItemAria: "حذف البند",
      noItemsYet: "لا توجد بنود بعد. أضيفوا من كتالوج مخزونكم للتسعير التلقائي، أو أدخلوا البنود يدويًا.",
      addFromCatalog: "إضافة من الكتالوج (يُسعِّر البند تلقائيًا)",
      pickInventoryItem: "اختر عنصرًا من المخزون…",
      manualEntry: "إدخال يدوي",
      noRateOnFile: "لا يوجد سعر مسجَّل لهذا العنصر — أدخلوا سعر الوحدة.",
      type: "النوع",
      description: "الوصف",
      descriptionPlaceholder: "3 ليالٍ — فندق هيلتون مراكش، غرفة مزدوجة",
      quantity: "الكمية",
      unitPrice: "سعر الوحدة",
      notesOptional: "ملاحظات (اختياري)",
      lineAmount: "مبلغ البند:",
      saveItem: "حفظ البند",
      addItem: "إضافة بند",
      cancel: "إلغاء",
      invalidItem: "بند غير صالح.",
      itemUpdated: "تم تحديث البند.",
      itemAdded: "تمت إضافة البند.",
      itemRemoved: "تمت إزالة البند.",
      catalogHotels: "الفنادق",
      catalogActivities: "الأنشطة",
      catalogGuides: "المرشدون السياحيون",
      catalogTransport: "النقل",
    },
    form: {
      customer: "العميل",
      selectCustomer: "اختر عميلًا",
      packageOptional: "الباقة (اختياري)",
      noPackage: "بدون باقة",
      validUntil: "صالح حتى",
      agent: "الوكيل",
      unassigned: "غير مُسنَد",
      travelStart: "بداية السفر",
      travelEnd: "نهاية السفر",
      adults: "البالغون",
      children: "الأطفال",
      currency: "العملة",
      discount: "الخصم",
      tax: "الضريبة",
      customerFacingNotes: "ملاحظات للعميل",
      termsAndConditions: "الشروط والأحكام",
      termsPlaceholder: "شروط الدفع، سياسة الإلغاء، ما يشمله العرض…",
      internalNotes: "ملاحظات داخلية",
      saving: "جارٍ الحفظ…",
      createQuote: "إنشاء عرض سعر",
      saveQuote: "حفظ العرض",
      created: "تم إنشاء عرض السعر.",
      saved: "تم الحفظ.",
    },
  },
  vouchers: {
    pickServiceLine: "اختاروا بند خدمة.",
    voucherIssued: "تم إصدار القسيمة.",
    voucherCancelled: "تم إلغاء القسيمة.",
    noVouchersYet: "لم تُصدَر أي قسائم بعد.",
    issued: "صادرة",
    cancelled: "ملغاة",
    cancelVoucherAria: "إلغاء القسيمة",
    serviceLine: "بند الخدمة",
    pickServiceToVoucher: "اختاروا الخدمة المراد إصدار قسيمة لها…",
    issueVoucher: "إصدار قسيمة",
    backToBooking: "العودة إلى الحجز",
    serviceVoucherLabel: "قسيمة خدمة",
    valid: "صالحة",
    cancelledLabel: "ملغاة",
    cancelledNotice: (date) => `أُلغيت هذه القسيمة بتاريخ ${date} ويجب عدم اعتمادها.`,
    service: "الخدمة",
    supplier: "المورّد",
    confirmationNumber: "رقم التأكيد",
    bookingReference: "مرجع الحجز",
    leadCustomer: "العميل الرئيسي",
    from: "من",
    to: "إلى",
    travellers: "المسافرون",
    issuedByFooter: (date, agency) =>
      `صدرت بتاريخ ${date} عن ${agency}. يُرجى تقديم هذه القسيمة للمورّد عند تسجيل الوصول / بداية الخدمة.`,
  },
};

const fr: AdminDictionary = {
  shell: {
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
      visaRequests: "Demandes de visa",
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
  },
  dashboard: {
    welcomeTitle: "Bienvenue sur",
    signedInAs: "Connecté en tant que",
    tagline: "Votre catalogue de fournisseurs et d'inventaire.",
    salesSection: "Ventes",
    inventorySection: "Inventaire",
    customers: "Clients",
    openLeads: "Prospects actifs",
    packages: "Forfaits",
    hotels: "Hôtels",
    transportation: "Transport",
    guides: "Guides",
    suppliers: "Fournisseurs",
    activities: "Activités",
    destinations: "Destinations",
  },
  common: {
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
  },
  leads: {
    pageTitle: "Prospects",
    openLead: "prospect actif",
    won: "gagné",
    lost: "perdu",
    addLead: "Ajouter un prospect",
    statOpenLeads: "Prospects actifs",
    statPipelineValue: "Valeur du pipeline",
    statWon: "Gagnés",
    statOverdueReminders: "Rappels en retard",
    searchPlaceholder: "Rechercher des prospects…",
    allStages: "Toutes les étapes",
    allOwners: "Tous les responsables",
    allSources: "Toutes les sources",
    noLeads: "Aucun prospect.",
    stage: "Étape",
    owner: "Responsable",
    unassigned: "Non assigné",
    convertToCustomer: "Convertir en client",
    viewCustomer: "Voir le client",
    lostPrefix: "Perdu :",
    tabDetails: "Détails",
    tabNotes: "Notes",
    tabReminders: "Rappels",
    tabHistory: "Historique",
    planMyTrip: "Plan My Trip",
    planMyTripAnswers: "Réponses Plan My Trip",
    destination: "Destination",
    travelPeriod: "Période de voyage",
    travelers: "Voyageurs",
    style: "Style",
    contact: "Contact",
    email: "E-mail",
    phone: "Téléphone",
    writeNote: "Écrire une note…",
    addNote: "Ajouter une note",
    noNotesYet: "Aucune note pour le moment.",
    deleteNote: "Supprimer la note",
    followUpPlaceholder: "Relancer le client…",
    addReminder: "Ajouter",
    noReminders: "Aucun rappel.",
    due: "Échéance",
    overdue: "en retard",
    reopenReminder: "Rouvrir le rappel",
    completeReminder: "Terminer le rappel",
    deleteReminder: "Supprimer le rappel",
    noHistoryYet: "Aucun historique pour le moment.",
    ownerUpdated: "Responsable mis à jour.",
    leadConverted: "Prospect converti.",
    convertConfirmTitle: "Convertir ce prospect en client ?",
    convertConfirmBody: "Le prospect sera marqué comme gagné.",
    lostReasonPrompt: "Raison de la perte de ce prospect ? (optionnel)",
    form: {
      leadTitle: "Titre du prospect",
      leadTitlePlaceholder: "Voyage de lune de miel à Bali — 10 jours",
      contactName: "Nom du contact",
      contactNamePlaceholder: "Sara Benali",
      source: "Source",
      unknown: "Inconnue",
      email: "E-mail",
      phone: "Téléphone",
      estValue: "Valeur estimée",
      currency: "Devise",
      expectedCloseDate: "Date de clôture prévue",
      owner: "Responsable",
      unassigned: "Non assigné",
      notes: "Notes",
      createLead: "Créer le prospect",
      saveLead: "Enregistrer",
      leadCreated: "Prospect créé.",
      saved: "Enregistré.",
    },
  },
  bookingRequests: {
    pageTitle: "Demandes de réservation",
    pageSubtitle: "Demandes de réservation reçues depuis le site public",
    searchPlaceholder: "Rechercher des demandes…",
    allStatuses: "Tous les statuts",
    allProductTypes: "Tous les types de produits",
    noRequests: "Aucune demande de réservation.",
    reference: "Référence",
    product: "Produit",
    travelers: "Voyageurs",
    adults: "Adultes",
    children: "Enfants",
    preferredDate: "Date souhaitée",
    returnDate: "Date de retour",
    contact: "Contact",
    status: "Statut",
    statusUpdated: "Statut mis à jour.",
    convertToBooking: "Convertir en réservation",
    tabDetails: "Détails",
    tabActivity: "Activité",
    requestedBy: "Demandé par",
    travelDate: "Date de voyage",
    pax: "Voyageurs",
    received: "Reçu le",
    noMatch: "Aucune demande de réservation ne correspond à vos filtres.",
    fullName: "Nom complet",
    phone: "Téléphone",
    whatsapp: "WhatsApp",
    notes: "Notes",
    requestedProduct: "Produit demandé",
    type: "Type",
    listing: "Annonce",
    contactSection: "Contact",
    customerRecord: "Fiche client",
    travelDetails: "Détails du voyage",
    travellersValue: (adults, children) => `${adults} adulte(s), ${children} enfant(s)`,
    notesFromTraveler: "Notes du voyageur",
    actions: "Actions",
    timeline: "Chronologie",
    convertedTo: "Convertie en réservation",
    viewBooking: "Voir la réservation",
    rejectedOn: "Rejetée le",
    cancelledOn: "Annulée le",
    emailAction: "E-mail",
    call: "Appeler",
    copyEmail: "Copier l'e-mail",
    copyPhone: "Copier le numéro",
    emailCopied: "E-mail copié",
    phoneCopied: "Numéro copié",
    markContacted: "Marquer comme contacté",
    revertToPending: "Repasser en attente",
    reject: "Rejeter",
    cancelAction: "Annuler",
    reasonPlaceholder: "Raison (optionnel)…",
    confirmReject: "Confirmer le rejet",
    confirmCancel: "Confirmer l'annulation",
    back: "Retour",
    addNote: "+ Ajouter une note",
    notePlaceholder: "ex. Appelé, message vocal laissé…",
    saveNote: "Enregistrer la note",
    markedContacted: "Marqué comme contacté.",
    requestRejected: "Demande rejetée.",
    requestCancelled: "Demande annulée.",
    bookingCreated: "Réservation créée à partir de la demande.",
    noteAdded: "Note ajoutée.",
  },
  visaRequests: {
    pageTitle: "Demandes de visa",
    pageSubtitle: "Demandes d'assistance visa reçues depuis le site public",
    exportCsv: "Exporter en CSV",
    searchPlaceholder: "Rechercher des demandes de visa…",
    allStatuses: "Tous les statuts",
    noMatch: "Aucune demande de visa ne correspond à vos filtres.",
    reference: "Référence",
    requestedBy: "Demandé par",
    destination: "Destination",
    visaType: "Type de visa",
    pax: "Voyageurs",
    status: "Statut",
    received: "Reçu le",
    statusUpdated: "Statut mis à jour.",
    requestSection: "Détails de la demande",
    destinationLabel: "Destination",
    nationalityLabel: "Nationalité",
    visaTypeLabel: "Type de visa",
    travelStartDate: "Date de début du voyage",
    travelEndDate: "Date de fin du voyage",
    bookingLinked: "Réservation liée",
    contactSection: "Contact",
    fullName: "Nom complet",
    phone: "Téléphone",
    phoneFormatValidated: "Format validé ✓",
    phoneVerified: "Vérifié par SMS",
    phoneNotVerified: "Non vérifié par SMS",
    whatsapp: "WhatsApp",
    customerRecord: "Fiche client",
    travelersSection: "Voyageurs",
    travellerName: "Nom",
    dateOfBirth: "Date de naissance",
    passportNumber: "Numéro de passeport",
    passportIssuingCountry: "Pays d'émission du passeport",
    passportIssueDate: "Date d'émission du passeport",
    passportExpiry: "Date d'expiration du passeport",
    documentsSection: "Documents envoyés",
    noDocuments: "Aucun document envoyé.",
    documentDownload: "Télécharger le document",
    documentCategoryPassport: "Passeport",
    documentCategoryImage: "Photo",
    documentCategoryPdf: "PDF",
    documentCategoryVisa: "Visa",
    documentCategoryContract: "Contrat",
    documentCategoryInsurance: "Assurance",
    documentCategoryNationalId: "Carte d'identité",
    documentCategoryVaccination: "Vaccination",
    documentCategoryOther: "Autre",
    notesFromTraveler: "Notes du voyageur",
    actions: "Actions",
    timeline: "Chronologie",
    approvedOn: "Approuvée le",
    rejectedOn: "Rejetée le",
    cancelledOn: "Annulée le",
    emailAction: "E-mail",
    call: "Appeler",
    copyEmail: "Copier l'e-mail",
    copyPhone: "Copier le numéro",
    emailCopied: "E-mail copié",
    phoneCopied: "Numéro copié",
    revertToPending: "Repasser en attente",
    reject: "Rejeter",
    cancelAction: "Annuler",
    reasonPlaceholder: "Raison (optionnel)…",
    confirmReject: "Confirmer le rejet",
    confirmCancel: "Confirmer l'annulation",
    back: "Retour",
    addNote: "+ Ajouter une note",
    notePlaceholder: "ex. Appelé, document supplémentaire en attente…",
    saveNote: "Enregistrer la note",
    requestRejected: "Demande rejetée.",
    requestCancelled: "Demande annulée.",
    noteAdded: "Note ajoutée.",
  },
  customers: {
    pageTitle: "Clients",
    addCustomer: "Ajouter un client",
    searchPlaceholder: "Rechercher des clients…",
    allTypes: "Tous les types",
    allSources: "Toutes les sources",
    noMatch: "Aucun client ne correspond à vos filtres.",
    addFirst: "Ajouter votre premier client",
    columnCustomer: "Client",
    columnType: "Type",
    columnContact: "Contact",
    columnSource: "Source",
    statusUpdated: "Statut mis à jour.",
    deleteConfirmTitle: "Supprimer ce client ?",
    deleteConfirmBody: "Ses notes et son historique seront archivés avec lui.",
    deleted: "Client supprimé.",
    detail: {
      backToList: "Clients",
      noContactInfo: "Aucune coordonnée",
      tabProfile: "Profil",
      tabContacts: "Contacts et adresses",
      tabNotes: "Notes",
      tabTimeline: "Historique",
      statNotes: "Notes",
      statActivities: "Activités",
      statLeads: "Prospects",
      statCustomerFor: "Client depuis",
      profileEmail: "E-mail",
      profilePhone: "Téléphone",
      profileNationality: "Nationalité",
      profilePassport: "Passeport",
      profileNotes: "Notes",
    },
    contacts: {
      heading: "Contacts",
      addContact: "Ajouter un contact",
      firstName: "Prénom",
      lastName: "Nom",
      email: "E-mail",
      phone: "Téléphone",
      role: "Rôle",
      rolePlaceholder: "Conjoint, assistant…",
      primaryContact: "Contact principal",
      save: "Enregistrer",
      saving: "Enregistrement…",
      cancel: "Annuler",
      noContacts: "Aucun contact supplémentaire.",
      noContactInfo: "Aucune coordonnée",
      editContactAria: "Modifier le contact",
      deleteContactAria: "Supprimer le contact",
      deleteConfirmTitle: "Supprimer ce contact ?",
      deleted: "Contact supprimé.",
    },
    addresses: {
      heading: "Adresses",
      addAddress: "Ajouter une adresse",
      label: "Libellé",
      labelPlaceholder: "Domicile, bureau…",
      line1: "Adresse — ligne 1",
      line2: "Adresse — ligne 2",
      city: "Ville",
      state: "État / Région",
      postalCode: "Code postal",
      country: "Pays",
      primaryAddress: "Adresse principale",
      save: "Enregistrer",
      saving: "Enregistrement…",
      cancel: "Annuler",
      noAddresses: "Aucune adresse.",
      addressFallback: "Adresse",
      editAddressAria: "Modifier l'adresse",
      deleteAddressAria: "Supprimer l'adresse",
      deleteConfirmTitle: "Supprimer cette adresse ?",
      deleted: "Adresse supprimée.",
    },
    notes: {
      writeNote: "Écrire une note…",
      addNote: "Ajouter une note",
      saving: "Enregistrement…",
      noNotesYet: "Aucune note pour le moment.",
      deleteNoteAria: "Supprimer la note",
      added: "Note ajoutée.",
    },
    timeline: {
      noActivityYet: "Aucune activité pour le moment.",
    },
    tags: {
      noTags: "Aucun tag",
      addTagPlaceholder: "Ajouter un tag…",
      attachTagAria: "Attacher le tag",
      removeTagAria: (name) => `Retirer le tag ${name}`,
    },
    form: {
      firstName: "Prénom",
      lastName: "Nom",
      email: "E-mail",
      phone: "Téléphone",
      customerType: "Type de client",
      leadSource: "Source du prospect",
      unknown: "Inconnue",
      preferredContact: "Contact préféré",
      dateOfBirth: "Date de naissance",
      nationality: "Nationalité",
      passportNumber: "Numéro de passeport",
      passportExpiry: "Expiration du passeport",
      accountManager: "Chargé de compte",
      unassigned: "Non assigné",
      generalNotes: "Notes générales",
      internal: "interne",
      saving: "Enregistrement…",
      createCustomer: "Créer le client",
      saveProfile: "Enregistrer le profil",
      possibleDuplicates: (count) =>
        count > 1 ? "Doublons potentiels trouvés" : "Doublon potentiel trouvé",
      created: "Client créé.",
      saved: "Enregistré.",
    },
  },
  settings: {
    pageTitle: "Paramètres",
    pageSubtitle: "Contenu du site public pour",
    yourPublicWebsite: "Votre site public",
    publicWebsiteIntro1: "Tout le monde peut visiter",
    publicWebsiteIntro2: "sans se connecter. Tout ce qui suit contrôle ce qu'ils voient — rien sur le site public n'est codé en dur, un champ vide ici n'apparaît simplement pas là-bas.",
    aboutAgency: "À propos de l'agence",
    tagline: "Slogan",
    taglinePlaceholder: "ex. Votre voyage, notre passion",
    description: "Description",
    descriptionPlaceholder: "Dites à vos visiteurs qui vous êtes et ce que vous proposez.",
    enableFrench: "Activer le français sur le site public",
    frenchNote: "L'arabe (ci-dessus) est la langue principale du site. Voici les versions françaises affichées quand un visiteur change de langue.",
    taglineFr: "Slogan (français)",
    taglineFrPlaceholder: "ex. Votre voyage, notre passion",
    descriptionFr: "Description (français)",
    descriptionFrPlaceholder: "Dites à vos visiteurs qui vous êtes et ce que vous proposez.",
    contactInfo: "Coordonnées",
    contactInfoIntro: "Affichées sur le site public et utilisées dans les confirmations de demande/réservation. Laissez un champ vide pour le masquer.",
    contactEmail: "E-mail de contact",
    contactPhone: "Téléphone de contact",
    whatsappNumber: "Numéro WhatsApp",
    businessHoursAr: "Horaires d'ouverture (arabe)",
    businessHoursFr: "Horaires d'ouverture (français)",
    fallsBackToArabic: "Optionnel — reprend la version arabe si laissé vide.",
    addressAr: "Adresse (arabe)",
    addressFr: "Adresse (français)",
    socialLinks: "Réseaux sociaux",
    testimonials: "Témoignages",
    testimonialsIntro: "Uniquement de vraies citations de clients — écrivez chacune exactement comme vous voulez qu'elle apparaisse, avec le nom du voyageur (ex. « Un voyage incroyable, je recommande ! » — Sarah M.). Cette section n'apparaît sur votre site public qu'une fois qu'au moins un témoignage a été ajouté.",
    testimonialsAr: "Témoignages (arabe)",
    testimonialsFr: "Témoignages (français)",
    testimonialsFrNote: "Optionnel — associé à la liste arabe par position. Si laissé vide, les citations arabes sont aussi affichées aux visiteurs francophones.",
    savePublicSettings: "Enregistrer",
    security: {
      title: "Mot de passe",
      intro: "Changez le mot de passe de votre compte pour accéder au tableau de bord.",
      currentPassword: "Mot de passe actuel",
      newPassword: "Nouveau mot de passe",
      confirmNewPassword: "Confirmer le nouveau mot de passe",
      savePassword: "Mettre à jour le mot de passe",
      saving: "Mise à jour…",
      passwordUpdated: "Mot de passe mis à jour.",
    },
  },
  documents: {
    pageTitle: "Documents",
    pageSubtitleCount: (count) =>
      `${count} document${count !== 1 ? "s" : ""} — passeports, visas, contrats, et plus`,
    searchPlaceholder: "Rechercher des documents…",
    allCategories: "Toutes les catégories",
    uploadDocument: "Téléverser un document",
    uploading: "Téléversement…",
    noDocuments: "Aucun document ne correspond à vos filtres.",
    renameAction: "Renommer / recatégoriser",
    replaceFileAction: "Remplacer le fichier",
    deleteDocumentAction: "Supprimer le document",
    deleteConfirmTitle: "Supprimer ce document ?",
    uploaded: "Document téléversé.",
    updated: "Document mis à jour.",
    replaced: "Fichier remplacé.",
    deleted: "Document supprimé.",
    failedToSave: "Échec de l'enregistrement du document.",
    failedToReplace: "Échec du remplacement du fichier.",
    uploadFailedPrefix: "Échec du téléversement :",
  },
  search: {
    pageTitle: "Recherche",
    pageSubtitle:
      "Rechercher parmi les forfaits, hôtels, activités, guides, fournisseurs et destinations.",
    defaultPlaceholder: "Rechercher des hôtels, activités, guides…",
    ariaLabel: "Rechercher",
    typeToSearch: "Tapez au moins 2 caractères pour rechercher.",
    noResults: (query) => `Aucun résultat pour « ${query} ».`,
  },
  guides: {
    pageTitle: "Guides touristiques",
    addGuide: "Ajouter un guide",
    addFirstGuide: "Ajouter votre premier guide",
    pageSubtitleCount: (count) => `${count} guide${count !== 1 ? "s" : ""} dans votre espace de travail`,
    searchPlaceholder: "Rechercher des guides ou des langues…",
    noMatch: "Aucun guide ne correspond à vos filtres.",
    attachmentHint:
      "Ajouter un guide ici ne l'affiche pas automatiquement sur le site public. Pour montrer un guide à vos clients, ouvrez le forfait concerné et ajoutez-le depuis l'onglet « Inventaire ».",
    attachmentLinkLabel: "Aller aux forfaits",
    attachedTo: "Rattaché à :",
    notAttached: "Non rattaché à un forfait — n'apparaîtra pas sur le site public.",
    columnGuide: "Guide",
    columnLanguages: "Langues",
    columnExperience: "Expérience",
    columnDailyRate: "Tarif journalier",
    columnStatus: "Statut",
    yearsAbbrev: "an",
    statusUpdated: "Statut mis à jour.",
    deleted: "Guide supprimé.",
    newPageTitle: "Nouveau guide touristique",
    form: {
      guideName: "Nom du guide",
      languages: "Langues",
      languagesPlaceholder: "Anglais, français, arabe…",
      certifications: "Certifications",
      certificationsPlaceholder: "Licence touristique nationale, premiers secours…",
      experienceYears: "Expérience (années)",
      dailyRate: "Tarif journalier",
      currency: "Devise",
      city: "Ville",
      country: "Pays",
      email: "E-mail",
      phone: "Téléphone",
      availabilityNotes: "Notes de disponibilité",
      availabilityPlaceholder: "Disponible les week-ends, hors saison uniquement…",
      internalNotes: "Notes internes",
      notShownToCustomers: "non visibles par les clients",
      saving: "Enregistrement…",
      createGuide: "Créer le guide",
      save: "Enregistrer",
      created: "Guide créé.",
      saved: "Enregistré.",
    },
  },
  transport: {
    pageTitle: "Transport",
    addProvider: "Ajouter un prestataire",
    addFirstProvider: "Ajouter votre premier prestataire",
    pageSubtitleCount: (count) =>
      `${count} prestataire${count !== 1 ? "s" : ""} dans votre espace de travail`,
    searchPlaceholder: "Rechercher des prestataires…",
    allTypes: "Tous les types",
    noMatch: "Aucun prestataire de transport ne correspond à vos filtres.",
    columnProvider: "Prestataire",
    columnType: "Type",
    columnLocation: "Emplacement",
    columnPhone: "Téléphone",
    columnStatus: "Statut",
    statusUpdated: "Statut mis à jour.",
    deleted: "Prestataire supprimé.",
    newPageTitle: "Nouveau prestataire de transport",
    form: {
      companyName: "Nom de l'entreprise",
      type: "Type",
      city: "Ville",
      country: "Pays",
      contactName: "Nom du contact",
      contactEmail: "E-mail du contact",
      contactPhone: "Téléphone du contact",
      website: "Site web",
      fleetNotes: "Notes sur la flotte",
      fleetNotesPlaceholder: "Types de véhicules, capacité, état…",
      pricingNotes: "Notes de tarification",
      pricingNotesPlaceholder: "Tarifs par transfert / par jour, tarification saisonnière…",
      internalNotes: "Notes internes",
      notShownToCustomers: "non visibles par les clients",
      saving: "Enregistrement…",
      createProvider: "Créer le prestataire",
      save: "Enregistrer",
      created: "Prestataire créé.",
      saved: "Enregistré.",
    },
  },
  suppliers: {
    pageTitle: "Fournisseurs",
    addSupplier: "Ajouter un fournisseur",
    addFirstSupplier: "Ajouter votre premier fournisseur",
    pageSubtitleCount: (count) =>
      `${count} fournisseur${count !== 1 ? "s" : ""} dans votre espace de travail`,
    statTotalSuppliers: "Total fournisseurs",
    statActive: "Actifs",
    statAvgRating: "Note moyenne",
    statTopCategory: "Catégorie principale",
    searchPlaceholder: "Rechercher des fournisseurs…",
    allTypes: "Tous les types",
    noMatch: "Aucun fournisseur ne correspond à vos filtres.",
    columnSupplier: "Fournisseur",
    columnType: "Type",
    columnLocation: "Emplacement",
    columnRating: "Note",
    columnStatus: "Statut",
    statusUpdated: "Statut mis à jour.",
    deleted: "Fournisseur supprimé.",
    newPageTitle: "Nouveau fournisseur",
    tabDetails: "Détails",
    tabContacts: "Contacts",
    tabDocuments: "Documents",
    form: {
      supplierName: "Nom du fournisseur",
      type: "Type",
      internalRating: "Note interne",
      unrated: "Non noté",
      contactName: "Nom du contact",
      email: "E-mail",
      phone: "Téléphone",
      website: "Site web",
      address: "Adresse",
      city: "Ville",
      country: "Pays",
      notes: "Notes",
      saving: "Enregistrement…",
      createSupplier: "Créer le fournisseur",
      save: "Enregistrer",
      created: "Fournisseur créé.",
      saved: "Enregistré.",
    },
    contacts: {
      heading: "Contacts",
      subtitle: "Les personnes avec qui vous travaillez chez ce fournisseur.",
      addContact: "Ajouter un contact",
      name: "Nom",
      role: "Rôle",
      rolePlaceholder: "Responsable des réservations…",
      primaryContact: "Contact principal",
      save: "Enregistrer",
      saving: "Enregistrement…",
      cancel: "Annuler",
      noContacts: "Aucun contact pour le moment.",
      noContactInfo: "Aucune coordonnée",
      editContactAria: "Modifier le contact",
      deleteContactAria: "Supprimer le contact",
      deleteConfirmTitle: "Supprimer ce contact ?",
      deleted: "Contact supprimé.",
    },
    documents: {
      heading: "Documents et contrats",
      subtitle: "Stockez les contrats et autres fichiers (PDF ou image, jusqu'à 16 Mo).",
      kindDocument: "Document",
      kindContract: "Contrat",
      upload: "Téléverser",
      uploading: "Téléversement…",
      noDocuments: "Aucun document pour le moment.",
      added: "Document ajouté.",
      removed: "Document retiré.",
      failedToSave: "Échec de l'enregistrement du document.",
      uploadFailedPrefix: "Échec du téléversement :",
    },
  },
  activities: {
    pageTitle: "Activités",
    pageSubtitleIntro:
      "Une visite ou excursion unique — quelques heures, pas un voyage de plusieurs jours. Utilisez ceci pour des expériences ponctuelles qu'un client peut ajouter seul, qu'il ait réservé un forfait ou non.",
    pageSubtitleCount: (count) => `${count} activité${count !== 1 ? "s" : ""} dans votre espace de travail.`,
    addActivity: "Ajouter une activité",
    addFirstActivity: "Ajouter votre première activité",
    searchPlaceholder: "Rechercher des activités…",
    noMatch: "Aucune activité ne correspond à vos filtres.",
    columnActivity: "Activité",
    columnCategory: "Catégorie",
    columnDuration: "Durée",
    columnPrice: "Prix",
    columnStatus: "Statut",
    minutesAbbrev: "min",
    hoursAbbrev: "h",
    statusUpdated: "Statut mis à jour.",
    deleted: "Activité supprimée.",
    newPageTitle: "Nouvelle activité",
    viewOnPublicSite: "Voir sur le site public",
    notLiveYet: "Pas encore publiée — activez-la depuis la liste pour l'afficher.",
    tabDetails: "Détails",
    tabMedia: "Médias",
    form: {
      nameAr: "Nom",
      urlSlug: "Slug d'URL",
      featured: "Activité en vedette",
      featuredDescription: "Les activités en vedette sont mises en avant sur le site de l'agence.",
      categoryAr: "Catégorie",
      durationMinutes: "Durée (minutes)",
      cityAr: "Ville",
      countryAr: "Pays",
      meetingPointAr: "Point de rendez-vous",
      descriptionAr: "Description",
      includedAr: "Inclus",
      excludedAr: "Exclus",
      supplier: "Fournisseur",
      noSupplier: "Aucun fournisseur",
      internalCost: "Coût interne",
      sellingPrice: "Prix de vente",
      currency: "Devise",
      saving: "Enregistrement…",
      createActivity: "Créer l'activité",
      saveDetails: "Enregistrer les détails",
      created: "Activité créée comme inactive. Activez-la depuis la liste pour l'afficher sur le site public.",
      saved: "Enregistré.",
      cancel: "Annuler",
      recommended: "Recommandé",
      pictureRequired: "Ajoutez une photo avant de continuer.",
      fixErrorsBeforeSubmitting:
        "Certaines erreurs doivent être corrigées avant la création — vous avez été ramené à l'étape concernée.",
      previous: "Précédent",
      next: "Suivant",
      stepIndicator: (step, total) => `Étape ${step} sur ${total}`,
      reviewCoverImage: "Image de couverture",
      reviewGalleryCount: (count) => `${count} photo${count !== 1 ? "s" : ""} dans la galerie`,
      reviewNoMedia: "Aucune photo ajoutée pour l'instant.",
      notSet: "Non défini",
      sections: {
        general: "Informations générales",
        generalHint: "Le nom apparaît comme titre de la page publique de l'activité et dans les listes.",
        location: "Lieu et horaire",
        locationHint: "Apparaît juste sous le titre sur la page publique de l'activité.",
        description: "Description",
        descriptionHint: "Apparaît dans le corps principal de la page publique de l'activité.",
        inclusions: "Inclus et exclus",
        inclusionsHint: "Apparaît dans la section « Inclus et exclus » de la page publique.",
        pricing: "Tarification et fournisseur",
        pricingHint:
          "Le prix de vente est affiché aux visiteurs comme prix de l'activité ; le fournisseur et le coût interne sont réservés à un usage interne et n'apparaissent jamais sur le site public.",
        media: "Médias",
        mediaHint: "Apparaît en haut de la page publique de l'activité et dans la galerie photo.",
        review: "Vérification",
        reviewHint: "Vérifiez tout avant d'enregistrer. Vous pouvez revenir modifier n'importe quelle étape.",
      },
    },
  },
  destinations: {
    pageTitle: "Destinations",
    pageSubtitleIntro:
      "Pas quelque chose qu'un client réserve — une page-guide inspirante pour un lieu (photos, points forts, attractions) qui renvoie vers les forfaits, hôtels, vols et activités que vous y proposez.",
    pageSubtitleCount: (count) =>
      `${count} destination${count !== 1 ? "s" : ""} dans votre espace de travail.`,
    addDestination: "Ajouter une destination",
    addFirstDestination: "Ajouter votre première destination",
    searchPlaceholder: "Rechercher des destinations…",
    noMatch: "Aucune destination ne correspond à vos filtres.",
    columnDestination: "Destination",
    columnCountry: "Pays",
    columnRegion: "Région",
    columnStatus: "Statut",
    statusUpdated: "Statut mis à jour.",
    deleted: "Destination supprimée.",
    newPageTitle: "Nouvelle destination",
    viewOnPublicSite: "Voir sur le site public",
    notLiveYet: "Pas encore publiée — activez-la depuis la liste pour l'afficher.",
    tabDetails: "Détails",
    tabMedia: "Médias",
    tabSeo: "SEO",
    heroImageTitle: "Image principale",
    heroImageDescription: "Grande image bannière pour la destination. Recommandé : 1600×600px.",
    form: {
      nameAr: "Nom",
      urlSlug: "Slug d'URL",
      featured: "Destination en vedette",
      featuredDescription:
        "Les destinations en vedette sont mises en avant sur le site de l'agence.",
      countryAr: "Pays",
      regionAr: "Région",
      cityAr: "Ville",
      descriptionAr: "Description",
      attractionsAr: "Attractions populaires",
      saving: "Enregistrement…",
      createDestination: "Créer la destination",
      saveDetails: "Enregistrer les détails",
      created: "Destination créée comme inactive. Activez-la depuis la liste pour l'afficher sur le site public.",
      saved: "Enregistré.",
      cancel: "Annuler",
      recommended: "Recommandé",
      pictureRequired: "Ajoutez une photo avant de continuer.",
      fixErrorsBeforeSubmitting:
        "Certaines erreurs doivent être corrigées avant de créer la destination — vous avez été ramené à l'étape concernée.",
      previous: "Précédent",
      next: "Suivant",
      stepIndicator: (step, total) => `Étape ${step} sur ${total}`,
      reviewCoverImage: "Image de couverture",
      reviewGalleryCount: (count) => `${count} photo${count !== 1 ? "s" : ""} dans la galerie`,
      reviewNoMedia: "Aucune photo ajoutée pour l'instant.",
      notSet: "Non défini",
      sections: {
        general: "Informations générales",
        generalHint: "Apparaissent comme titre et description de la page publique de la destination.",
        description: "Description",
        location: "Emplacement",
        locationHint: "Apparaît sur la page publique de la destination.",
        content: "Contenu",
        contentHint: "Apparaît dans la section « Attractions populaires » de la page publique.",
        media: "Médias",
        mediaHint: "Apparaît comme bannière en haut de la page publique et dans la galerie.",
        review: "Révision",
        reviewHint: "Vérifiez tout avant de créer la destination.",
      },
    },
    seo: {
      seoTitleAr: "Titre SEO",
      seoDescriptionAr: "Description SEO",
      charsCount: (count) => `${count} caractères`,
      searchPreview: "Aperçu de recherche",
      addSeoDescriptionPlaceholder: "Ajoutez une description SEO pour contrôler cet extrait…",
      saving: "Enregistrement…",
      saveSeo: "Enregistrer le SEO",
      seoSaved: "SEO enregistré.",
    },
  },
  hotels: {
    pageTitle: "Hôtels",
    pageSubtitleIntro:
      "Un logement autonome, réservable seul sans forfait complet. Utilisez ceci pour les clients qui ont seulement besoin d'une chambre — un forfait peut toujours référencer l'un de ces hôtels dans son itinéraire.",
    pageSubtitleCount: (count) => `${count} hôtel${count !== 1 ? "s" : ""} dans votre espace de travail.`,
    addHotel: "Ajouter un hôtel",
    addFirstHotel: "Ajouter votre premier hôtel",
    searchPlaceholder: "Rechercher des hôtels…",
    allCategories: "Toutes les catégories",
    allStars: "Toutes les étoiles",
    starsLabel: (count) => `${count} étoile${count !== 1 ? "s" : ""}`,
    noMatch: "Aucun hôtel ne correspond à vos filtres.",
    columnHotel: "Hôtel",
    columnCategory: "Catégorie",
    columnLocation: "Emplacement",
    columnRooms: "Chambres",
    columnStatus: "Statut",
    statusUpdated: "Statut mis à jour.",
    deleted: "Hôtel supprimé.",
    newPageTitle: "Nouvel hôtel",
    lastUpdated: (date) => `Mis à jour le ${date}`,
    viewOnPublicSite: "Voir sur le site public",
    notLiveYet: "Pas encore publié — activez-le depuis la liste pour l'afficher.",
    tabDetails: "Détails",
    tabMedia: "Médias",
    tabRooms: "Types de chambres",
    coverImageDescription: "Photo principale affichée dans les listes. Recommandé : 1200×630px.",
    galleryDescription: "Jusqu'à 10 photos de l'établissement.",
    form: {
      nameAr: "Nom",
      urlSlug: "Slug d'URL",
      featured: "Hôtel en vedette",
      featuredDescription: "Les hôtels en vedette sont mis en avant sur le site de l'agence.",
      category: "Catégorie",
      stars: "Étoiles",
      cityAr: "Ville",
      countryAr: "Pays",
      addressAr: "Adresse",
      latitude: "Latitude",
      longitude: "Longitude",
      descriptionAr: "Description",
      amenitiesAr: "Équipements",
      contactName: "Nom du contact",
      contactEmail: "E-mail du contact",
      contactPhone: "Téléphone du contact",
      website: "Site web",
      internalNotes: "Notes internes",
      notShownToCustomers: "non visibles par les clients",
      saving: "Enregistrement…",
      createHotel: "Créer l'hôtel",
      saveDetails: "Enregistrer les détails",
      created: "Hôtel créé comme inactif. Activez-le depuis la liste pour l'afficher sur le site public.",
      saved: "Hôtel enregistré.",
      cancel: "Annuler",
      recommended: "Recommandé",
      pictureRequired: "Ajoutez une photo avant de continuer.",
      fixErrorsBeforeSubmitting:
        "Certaines erreurs doivent être corrigées avant de créer l'hôtel — vous avez été ramené à l'étape concernée.",
      previous: "Précédent",
      next: "Suivant",
      stepIndicator: (step, total) => `Étape ${step} sur ${total}`,
      reviewCoverImage: "Image de couverture",
      reviewGalleryCount: (count) => `${count} photo${count !== 1 ? "s" : ""} dans la galerie`,
      reviewNoMedia: "Aucune photo ajoutée pour l'instant.",
      notSet: "Non défini",
      sections: {
        general: "Informations générales",
        generalHint: "Apparaissent comme titre et description de la page publique de l'hôtel.",
        description: "Description",
        location: "Emplacement",
        locationHint: "Apparaît sur la page publique de l'hôtel et sur la carte.",
        details: "Détails",
        detailsHint: "Apparaissent comme étoiles et liste d'équipements sur la page publique.",
        contact: "Contact",
        contactHint: "Usage interne uniquement — n'apparaît jamais sur le site public.",
        media: "Médias",
        mediaHint: "Apparaît en haut de la page publique de l'hôtel et dans la galerie.",
        review: "Vérification",
        reviewHint: "Vérifiez tout avant de créer l'hôtel.",
      },
    },
    rooms: {
      heading: "Types de chambres",
      subtitle: "Catégories de chambres, capacité et tarification pour cet hôtel.",
      addRoomType: "Ajouter un type de chambre",
      noRoomTypes: "Aucun type de chambre pour le moment.",
      save: "Enregistrer",
      cancel: "Annuler",
      saving: "Enregistrement…",
      deleteConfirmTitle: "Supprimer ce type de chambre ?",
      deleted: "Type de chambre supprimé.",
      editAria: "Modifier",
      deleteAria: "Supprimer",
      type: "Type",
      nameAr: "Nom (arabe)",
      nameFr: "Nom (français)",
      optionalFallsBackAr: "Optionnel — reprend la version arabe si laissé vide.",
      capacity: "Capacité",
      beds: "Lits",
      maxOccupancy: "Occupation maximale",
      currency: "Devise",
      basePrice: "Prix de base",
      perNight: "par nuit",
      internalCost: "Coût interne",
      net: "net",
      photos: "Photos",
      notesAr: "Notes (arabe)",
      notesFr: "Notes (français)",
      optional: "optionnel",
      pax: "pers.",
      bedsAbbrev: (count) => `${count} lit${count !== 1 ? "s" : ""}`,
      perNightSuffix: "/nuit",
    },
  },
  flights: {
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
    viewOnPublicSite: "Voir sur le site public",
    notLiveYet: "Pas encore publié — publiez-le depuis l'onglet « Statut » pour l'afficher.",
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
  },
  packages: {
    pageTitle: "Forfaits",
    pageSubtitleIntro:
      "Un voyage complet et groupé — hébergement, transport et activités vendus ensemble comme un seul produit avec son propre itinéraire. Utilisez ceci pour les voyages de plusieurs jours vendus comme une offre unique, pas pour réserver seulement un vol ou une chambre (voir Vols/Hôtels pour cela).",
    pageSubtitleCount: (count) => `${count} forfait${count !== 1 ? "s" : ""} dans votre espace de travail.`,
    newPackage: "Nouveau forfait",
    newPageSubtitle: "Commencez à créer un nouveau forfait de voyage. Vous pourrez le publier une fois prêt.",
    lastUpdated: (date) => `Mis à jour le ${date}`,
    viewOnPublicSite: "Voir sur le site public",
    notLiveYet: "Pas encore publié — publiez-le pour l'afficher.",
    createFirstPackage: "Créer votre premier forfait",
    searchPlaceholder: "Rechercher des forfaits…",
    allStatuses: "Tous les statuts",
    statusDraft: "Brouillon",
    statusPublished: "Publié",
    statusArchived: "Archivé",
    noMatch: "Aucun forfait ne correspond à vos filtres.",
    columnPackage: "Forfait",
    columnStatus: "Statut",
    columnDestination: "Destination",
    columnDuration: "Durée",
    columnFromPrice: "À partir de",
    columnUpdated: "Mis à jour",
    daysAbbrev: "jours",
    nightsAbbrev: "nuits",
    statusUpdated: "Statut mis à jour.",
    deleted: "Forfait supprimé.",
    duplicated: "Forfait dupliqué.",
    duplicate: "Dupliquer",
    publish: "Publier",
    unpublish: "Dépublier",
    archive: "Archiver",
    restoreToDraft: "Remettre en brouillon",
    statusSectionHeading: "Statut",
    statusSectionSubtitle: "Contrôlez la visibilité de ce forfait.",
    dangerZoneHeading: "Zone de danger",
    dangerZoneSubtitle: "La suppression d'un forfait est définitive et irréversible.",
    deletePackage: "Supprimer le forfait",
    tabDetails: "Détails",
    tabBuilder: "Contenu",
    tabMedia: "Médias",
    tabSeo: "SEO",
    tabItinerary: "Itinéraire",
    tabInventory: "Inventaire",
    coverImageDescription: "Affichée en haut de la fiche du forfait. Recommandé : 1200×630px.",
    galleryDescription: "Jusqu'à 10 images supplémentaires. Affichées sur la page de détail du forfait.",
    noItineraryConfigured: "Aucun itinéraire configuré.",
    dayLabel: "Jour",
    noSeoConfigured: "Aucun paramètre SEO configuré.",
    yes: "Oui",
    detailsForm: {
      nameAr: "Nom",
      urlSlug: "Slug d'URL",
      shortDescriptionAr: "Description courte",
      maxChars: "300 caractères maximum.",
      fullDescriptionAr: "Description complète",
      destinationAr: "Destination",
      countryAr: "Pays",
      durationDays: "Durée (jours)",
      durationNights: "Durée (nuits)",
      categoryAr: "Catégorie",
      difficulty: "Niveau de difficulté",
      selectDifficulty: "Sélectionner la difficulté",
      difficultyEasy: "Facile",
      difficultyModerate: "Modéré",
      difficultyChallenging: "Difficile",
      difficultyExtreme: "Extrême",
      internalCost: "Coût interne",
      notShownPublicly: "Non visible publiquement.",
      fromPrice: "À partir de",
      fromPriceHint: "Affiché sur le site comme prix de départ — le prix final est confirmé avec le voyageur.",
      currency: "Devise",
      featured: "Forfait en vedette",
      featuredDescription: "Les forfaits en vedette sont mis en avant sur le site de l'agence.",
      saving: "Enregistrement…",
      saveDetails: "Enregistrer les détails",
      saved: "Détails enregistrés.",
    },
    builderForm: {
      highlightsAr: "Points forts",
      includedAr: "Inclus",
      excludedAr: "Non inclus",
      importantNotesAr: "Notes importantes",
      whatToBringAr: "À apporter",
      meetingPointAr: "Point de rendez-vous",
      cancellationPolicyAr: "Politique d'annulation",
      saving: "Enregistrement…",
      saveBuilderContent: "Enregistrer le contenu",
      saved: "Contenu enregistré.",
    },
    seoForm: {
      seoTitleAr: "Titre SEO",
      charsCount: (count) => `${count} caractères — affiché dans les résultats de recherche.`,
      seoDescriptionAr: "Description SEO",
      previewAr: "Aperçu",
      noDescription: "Aucune description.",
      saving: "Enregistrement…",
      saveSeo: "Enregistrer le SEO",
      saved: "Paramètres SEO enregistrés.",
    },
    createForm: {
      name: "Nom",
      description: "Description",
      urlSlug: "Slug d'URL",
      creating: "Création…",
      createPackage: "Créer le forfait",
      cancel: "Annuler",
      created: "Forfait créé.",
    },
    readOnly: {
      name: "Nom",
      slug: "Slug",
      shortDescription: "Description courte",
      description: "Description",
      destination: "Destination",
      country: "Pays",
      duration: "Durée",
      category: "Catégorie",
      difficulty: "Difficulté",
      featured: "En vedette",
      highlights: "Points forts",
      included: "Inclus",
      excluded: "Non inclus",
      importantNotes: "Notes importantes",
      whatToBring: "À apporter",
      meetingPoint: "Point de rendez-vous",
      cancellationPolicy: "Politique d'annulation",
      seoTitle: "Titre SEO",
      seoDescription: "Description SEO",
    },
  },
  itinerary: {
    noItineraryYet: "Aucun itinéraire pour le moment",
    addFirstDay: "Ajouter le jour 1",
    addDay: (n) => `Ajouter le jour ${n}`,
    dayLabel: "Jour",
    failedToReorderDays: "Échec de la réorganisation des jours.",
    failedToReorderActivities: "Échec de la réorganisation des activités.",
    dragToReorderDay: "Glisser pour réorganiser le jour",
    dragToReorderActivity: "Glisser pour réorganiser l'activité",
    expand: "Développer",
    collapse: "Réduire",
    editDay: "Modifier le jour",
    deleteDay: "Supprimer le jour",
    deleteDayConfirmTitle: "Supprimer ce jour et toutes ses activités ?",
    failedToDeleteDay: "Échec de la suppression du jour.",
    addActivity: "Ajouter une activité",
    editActivity: "Modifier l'activité",
    deleteActivity: "Supprimer l'activité",
    deleteActivityConfirmTitle: "Supprimer cette activité ?",
    failedToDeleteActivity: "Échec de la suppression de l'activité.",
    breakfastAbbrev: "P-dej",
    lunchAbbrev: "Déj",
    dinnerAbbrev: "Dîner",
    dayForm: {
      titleAr: "Titre du jour (arabe)",
      titleFr: "Titre du jour (français)",
      optionalFallsBackAr: "Optionnel — reprend la version arabe si laissé vide.",
      descriptionAr: "Description (arabe)",
      descriptionFr: "Description (français)",
      optional: "optionnel",
      breakfastAr: "Petit-déjeuner (arabe)",
      lunchAr: "Déjeuner (arabe)",
      dinnerAr: "Dîner (arabe)",
      breakfastFr: "Petit-déjeuner (français)",
      lunchFr: "Déjeuner (français)",
      dinnerFr: "Dîner (français)",
      transferNotesAr: "Notes de transfert (arabe)",
      transferNotesFr: "Notes de transfert (français)",
      accommodationAr: "Hébergement (arabe)",
      accommodationFr: "Hébergement (français)",
      internalNotes: "Notes internes",
      saving: "Enregistrement…",
      saveDay: "Enregistrer le jour",
      cancel: "Annuler",
    },
    activityForm: {
      titleAr: "Activité (arabe)",
      titleFr: "Activité (français)",
      optionalFallsBackAr: "Optionnel — reprend la version arabe si laissé vide.",
      descriptionAr: "Description (arabe)",
      descriptionFr: "Description (français)",
      optional: "optionnel",
      duration: "Durée",
      durationHint: "en minutes, optionnel",
      saving: "Enregistrement…",
      save: "Ajouter une activité",
      cancel: "Annuler",
    },
  },
  bookings: {
    pageTitle: "Réservations",
    statsSummary: (total, active, upcoming) => `${total} total · ${active} actives · ${upcoming} à venir`,
    newBooking: "Nouvelle réservation",
    statActiveRevenue: "Revenu actif",
    statConfirmed: "Confirmées",
    statInProgress: "En cours",
    statCompleted: "Terminées",
    searchPlaceholder: "Rechercher par référence ou client…",
    allStatuses: "Tous les statuts",
    allAgents: "Tous les agents",
    noMatch: "Aucune réservation ne correspond à vos filtres.",
    createFirstBooking: "Créer votre première réservation",
    columnReference: "Référence",
    columnCustomer: "Client",
    columnTravelDates: "Dates du voyage",
    columnPax: "Voyageurs",
    columnStatus: "Statut",
    columnTotal: "Total",
    backToList: "Réservations",
    newPageTitle: "Nouvelle réservation",
    newPageSubtitle: "Créez l'en-tête de la réservation, puis ajoutez les lignes sur la page de réservation.",
    needCustomerFirst: "Vous avez besoin d'au moins un client avant de créer une réservation.",
    addCustomer: "Ajouter un client",
    cancelledOn: (date) => `Annulée le ${date}`,
    lineItems: "Lignes",
    subtotal: "Sous-total",
    discount: "Remise",
    tax: "Taxe",
    total: "Total",
    travellers: "Voyageurs",
    supplierConfirmations: "Confirmations fournisseurs",
    vouchers: "Bons",
    customerFacingNotes: "Notes visibles par le client",
    internalNotes: "Notes internes",
    detailsHeading: "Détails",
    travelStart: "Début du voyage",
    travelEnd: "Fin du voyage",
    travellersValue: (adults, children) => `${adults} adulte(s), ${children} enfant(s)`,
    agent: "Agent",
    unassigned: "Non assigné",
    created: "Créée le",
    statusHeading: "Statut",
    timeline: "Chronologie",
    statusActions: {
      markStatus: (status) => `Marquer ${status}`,
      cancelBooking: "Annuler la réservation",
      reasonPlaceholder: "Raison (optionnel)…",
      confirmCancellation: "Confirmer l'annulation",
      keepBooking: "Conserver la réservation",
      assignedAgent: "Agent assigné",
      statusUpdatedTo: (status) => `Réservation marquée ${status}.`,
      cancelled: "Réservation annulée.",
      agentUpdated: "Agent mis à jour.",
    },
    itemsEditor: {
      columnType: "Type",
      columnDescription: "Description",
      columnQty: "Qté",
      columnUnit: "Unité",
      columnAmount: "Montant",
      editItemAria: "Modifier l'article",
      deleteItemAria: "Supprimer l'article",
      noItemsYet: "Aucune ligne pour le moment. Ajoutez des hôtels, transferts, activités et plus pour construire la réservation.",
      type: "Type",
      description: "Description",
      descriptionPlaceholder: "3 nuits — Hilton Marrakech, chambre double",
      quantity: "Quantité",
      unitPrice: "Prix unitaire",
      notesOptional: "Notes (optionnel)",
      lineAmount: "Montant de la ligne :",
      saveItem: "Enregistrer l'article",
      addItem: "Ajouter un article",
      cancel: "Annuler",
      invalidItem: "Article invalide.",
      itemUpdated: "Article mis à jour.",
      itemAdded: "Article ajouté.",
      itemRemoved: "Article retiré.",
    },
    form: {
      customer: "Client",
      selectCustomer: "Sélectionner un client",
      packageOptional: "Forfait (optionnel)",
      noPackage: "Aucun forfait",
      travelStart: "Début du voyage",
      travelEnd: "Fin du voyage",
      adults: "Adultes",
      children: "Enfants",
      agent: "Agent",
      unassigned: "Non assigné",
      currency: "Devise",
      discount: "Remise",
      tax: "Taxe",
      customerFacingNotes: "Notes visibles par le client",
      internalNotes: "Notes internes",
      saving: "Enregistrement…",
      createBooking: "Créer la réservation",
      saveBooking: "Enregistrer la réservation",
      created: "Réservation créée.",
      saved: "Enregistré.",
    },
  },
  confirmations: {
    addLineItemsHint: "Ajoutez des éléments à la réservation pour suivre les confirmations fournisseurs.",
    notRequested: "Non demandé",
    request: "Demander",
    reRequest: "Redemander",
    confirm: "Confirmer",
    reject: "Refuser",
    linkSupplierPlaceholder: "Lier un fournisseur (optionnel)",
    noSupplierRecord: "Aucune fiche fournisseur",
    supplierNamePlaceholder: "Nom du fournisseur (optionnel)",
    sendRequest: "Envoyer la demande",
    confirmationRequested: "Demande de confirmation envoyée.",
    confirmationNumberPlaceholder: "Numéro de confirmation",
    saveConfirmation: "Enregistrer la confirmation",
    markedConfirmed: "Marqué comme confirmé.",
    reasonPlaceholder: "Motif (optionnel)",
    markRejected: "Marquer comme refusé",
    markedRejected: "Marqué comme refusé.",
    statusPending: "En attente",
    statusConfirmed: "Confirmé",
    statusRejected: "Refusé",
  },
  quotes: {
    pageTitle: "Devis",
    statsSummary: (total, sent, acceptanceRate) =>
      `${total} total · ${sent} envoyés · ${acceptanceRate}% taux d'acceptation`,
    newQuote: "Nouveau devis",
    statOpenValue: "Valeur ouverte",
    statSent: "Envoyés",
    statAccepted: "Acceptés",
    statConverted: "Convertis",
    searchPlaceholder: "Rechercher par référence ou client…",
    allStatuses: "Tous les statuts",
    allAgents: "Tous les agents",
    noMatch: "Aucun devis ne correspond à vos filtres.",
    createFirstQuote: "Créer votre premier devis",
    columnReference: "Référence",
    columnCustomer: "Client",
    columnValidUntil: "Valide jusqu'au",
    columnStatus: "Statut",
    columnTotal: "Total",
    viewBooking: "Voir la réservation",
    backToList: "Devis",
    newPageTitle: "Nouveau devis",
    newPageSubtitle:
      "Créez l'en-tête du devis, puis ajoutez les lignes — tarifées automatiquement depuis votre inventaire — sur la page du devis.",
    needCustomerFirst: "Vous avez besoin d'au moins un client avant de créer un devis.",
    addCustomer: "Ajouter un client",
    editQuoteHeader: "Modifier l'en-tête du devis",
    editQuotePageTitle: "Modifier le devis",
    convertedOn: (date) => `Converti en réservation le ${date}`,
    declinedOn: (date) => `Refusé le ${date}`,
    expiredNotice: (date) =>
      `Ce devis a dépassé sa date de validité (${date}). Marquez-le comme expiré ou révisez-le et renvoyez-le.`,
    lineItems: "Lignes",
    subtotal: "Sous-total",
    discount: "Remise",
    tax: "Taxe",
    total: "Total",
    customerFacingNotes: "Notes visibles par le client",
    termsAndConditions: "Conditions générales",
    internalNotes: "Notes internes",
    detailsHeading: "Détails",
    validUntil: "Valide jusqu'au",
    travelStart: "Début du voyage",
    travelEnd: "Fin du voyage",
    travellersLabel: "Voyageurs",
    travellersValue: (adults, children) => `${adults} adulte(s), ${children} enfant(s)`,
    agent: "Agent",
    unassigned: "Non assigné",
    created: "Créé le",
    statusHeading: "Statut",
    timeline: "Chronologie",
    statusActions: {
      convertToBooking: "Convertir en réservation",
      markStatus: (status) => `Marquer ${status}`,
      decline: "Refuser",
      reasonPlaceholder: "Raison (optionnel)…",
      confirmDecline: "Confirmer le refus",
      keepQuote: "Conserver le devis",
      assignedAgent: "Agent assigné",
      statusUpdatedTo: (status) => `Devis marqué ${status}.`,
      declined: "Devis refusé.",
      bookingCreated: "Réservation créée à partir du devis.",
      agentUpdated: "Agent mis à jour.",
    },
    itemsEditor: {
      columnType: "Type",
      columnDescription: "Description",
      columnQty: "Qté",
      columnUnit: "Unité",
      columnAmount: "Montant",
      editItemAria: "Modifier l'article",
      deleteItemAria: "Supprimer l'article",
      noItemsYet: "Aucune ligne pour le moment. Ajoutez depuis votre catalogue d'inventaire pour une tarification automatique, ou saisissez les lignes manuellement.",
      addFromCatalog: "Ajouter depuis le catalogue (tarifie automatiquement la ligne)",
      pickInventoryItem: "Choisir un article d'inventaire…",
      manualEntry: "Saisie manuelle",
      noRateOnFile: "Aucun tarif enregistré pour cet article — saisissez le prix unitaire.",
      type: "Type",
      description: "Description",
      descriptionPlaceholder: "3 nuits — Hilton Marrakech, chambre double",
      quantity: "Quantité",
      unitPrice: "Prix unitaire",
      notesOptional: "Notes (optionnel)",
      lineAmount: "Montant de la ligne :",
      saveItem: "Enregistrer l'article",
      addItem: "Ajouter un article",
      cancel: "Annuler",
      invalidItem: "Article invalide.",
      itemUpdated: "Article mis à jour.",
      itemAdded: "Article ajouté.",
      itemRemoved: "Article retiré.",
      catalogHotels: "Hôtels",
      catalogActivities: "Activités",
      catalogGuides: "Guides",
      catalogTransport: "Transport",
    },
    form: {
      customer: "Client",
      selectCustomer: "Sélectionner un client",
      packageOptional: "Forfait (optionnel)",
      noPackage: "Aucun forfait",
      validUntil: "Valide jusqu'au",
      agent: "Agent",
      unassigned: "Non assigné",
      travelStart: "Début du voyage",
      travelEnd: "Fin du voyage",
      adults: "Adultes",
      children: "Enfants",
      currency: "Devise",
      discount: "Remise",
      tax: "Taxe",
      customerFacingNotes: "Notes visibles par le client",
      termsAndConditions: "Conditions générales",
      termsPlaceholder: "Conditions de paiement, politique d'annulation, ce qui est inclus…",
      internalNotes: "Notes internes",
      saving: "Enregistrement…",
      createQuote: "Créer le devis",
      saveQuote: "Enregistrer le devis",
      created: "Devis créé.",
      saved: "Enregistré.",
    },
  },
  vouchers: {
    pickServiceLine: "Choisissez une ligne de service.",
    voucherIssued: "Bon émis.",
    voucherCancelled: "Bon annulé.",
    noVouchersYet: "Aucun bon émis pour l'instant.",
    issued: "Émis",
    cancelled: "Annulé",
    cancelVoucherAria: "Annuler le bon",
    serviceLine: "Ligne de service",
    pickServiceToVoucher: "Choisissez le service à créditer d'un bon…",
    issueVoucher: "Émettre un bon",
    backToBooking: "Retour à la réservation",
    serviceVoucherLabel: "Bon de service",
    valid: "VALIDE",
    cancelledLabel: "ANNULÉ",
    cancelledNotice: (date) => `Ce bon a été annulé le ${date} et ne doit pas être honoré.`,
    service: "Service",
    supplier: "Fournisseur",
    confirmationNumber: "N° de confirmation",
    bookingReference: "Référence de réservation",
    leadCustomer: "Client principal",
    from: "Du",
    to: "Au",
    travellers: "Voyageurs",
    issuedByFooter: (date, agency) =>
      `Émis le ${date} par ${agency}. Présentez ce bon au fournisseur à l'arrivée / au début du service.`,
  },
};

export const defaultAdminLocale: Locale = "ar";

export function getAdminDictionary(locale: Locale): AdminDictionary {
  return locale === "fr" ? fr : ar;
}
