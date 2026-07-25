#!/usr/bin/env node
/**
 * One-time population of launch-ready showcase content: destinations,
 * hotels, flights, and packages across four real markets, each with real
 * sourced photography uploaded to Supabase Storage. Arabic is the
 * bare/source field per the tenant's primary language (see PROJECT.md
 * bilingual sprint); French is the secondary translation. Not idempotent —
 * intended to run once against a freshly bootstrapped tenant (see
 * prisma/seed.mjs).
 *
 * KNOWN DRIFT: the live database this shipped to has since replaced the
 * Marrakech destination/hotel/flight/package below with Tunis (Algeria has
 * no direct flights to Morocco — see PROJECT.md's final-delivery section),
 * via a one-off script that was not folded back into this file. Re-running
 * this script against a fresh database reproduces the original
 * Marrakech-based set, not the live one — swap that section for Tunis (or
 * re-run against a copy of the live DB's export) before using this for a
 * fresh install.
 *
 * Usage: node --env-file=.env scripts/seed-showcase-content.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "media";
const PHOTOS_DIR =
  "C:/Users/HW/AppData/Local/Temp/claude/C--Users-HW/a6100a96-199d-4ebf-b116-58dc308915d8/scratchpad/photos";

async function uploadPhoto(filename, folder) {
  const filePath = path.join(PHOTOS_DIR, filename);
  const buffer = readFileSync(filePath);
  const ext = filename.split(".").pop();
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed for ${filename}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return { key, url: data.publicUrl };
}

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found — run `npx prisma db seed` first.");
  const tenantId = tenant.id;
  console.log(`Seeding showcase content into tenant: ${tenant.name} (${tenant.slug})`);

  console.log("Uploading photos to Supabase Storage...");
  const img = {
    marrakechHero: await uploadPhoto("marrakech-dest.jpg", "resource-cover"),
    marrakechHotel: await uploadPhoto("marrakech-hero.jpg", "resource-cover"),
    parisHero: await uploadPhoto("test-paris.jpg", "resource-cover"),
    parisHotel: await uploadPhoto("paris-hotel.jpg", "resource-cover"),
    dubaiHero: await uploadPhoto("dubai-dest2.jpg", "resource-cover"),
    dubaiLandmarkGallery: await uploadPhoto("dubai-hotel3.jpg", "resource-gallery"),
    dubaiHotel: await uploadPhoto("dubai-hotel-generic.jpg", "resource-cover"),
    dubaiDesertGallery: await uploadPhoto("dubai-desert2.jpg", "resource-gallery"),
    istanbulHero: await uploadPhoto("istanbul-dest.jpg", "resource-cover"),
    istanbulHotel: await uploadPhoto("istanbul-hotel.png", "resource-cover"),
  };
  console.log("Photos uploaded.");

  // ---------------------------------------------------------------------
  // Destinations
  // ---------------------------------------------------------------------
  await prisma.destination.create({
    data: {
      tenantId,
      name: "مراكش",
      nameFr: "Marrakech",
      slug: "marrakech",
      featured: true,
      country: "المغرب",
      countryFr: "Maroc",
      region: "مراكش-آسفي",
      regionFr: "Marrakech-Safi",
      city: "مراكش",
      cityFr: "Marrakech",
      description:
        "المدينة الحمراء، حيث تتشابك أزقة المدينة القديمة مع سحر الأسواق التقليدية وعبق التاريخ المغربي العريق. من ساحة جامع الفنا النابضة بالحياة إلى هدوء حدائق ماجوريل الزرقاء، تقدم مراكش تجربة لا تُنسى بين الثقافة والضيافة الأصيلة وجبال الأطلس الشامخة في الأفق.",
      descriptionFr:
        "La ville ocre, où les ruelles de la médina se mêlent à la magie des souks traditionnels et à l'histoire marocaine millénaire. De la place Jemaa el-Fna, vibrante de vie, à la sérénité bleue du Jardin Majorelle, Marrakech offre une expérience inoubliable entre culture, hospitalité authentique et les sommets de l'Atlas à l'horizon.",
      popularAttractions: [
        "ساحة جامع الفنا",
        "حدائق ماجوريل",
        "قصر الباهية",
        "أسوار المدينة القديمة",
        "جبال الأطلس",
      ],
      popularAttractionsFr: [
        "Place Jemaa el-Fna",
        "Jardin Majorelle",
        "Palais de la Bahia",
        "Remparts de la médina",
        "Montagnes de l'Atlas",
      ],
      heroImageKey: img.marrakechHero.key,
      heroImageUrl: img.marrakechHero.url,
      seoTitle: "رحلات إلى مراكش | One To One",
      seoTitleFr: "Voyages à Marrakech | One To One",
      seoDescription: "اكتشف مراكش مع باقاتنا المصممة خصيصًا: رياضات فاخرة، جولات ثقافية، ورحلات إلى الأطلس.",
      seoDescriptionFr:
        "Découvrez Marrakech avec nos séjours sur-mesure : riads de charme, circuits culturels et excursions dans l'Atlas.",
      status: "ACTIVE",
    },
  });

  await prisma.destination.create({
    data: {
      tenantId,
      name: "باريس",
      nameFr: "Paris",
      slug: "paris",
      featured: true,
      country: "فرنسا",
      countryFr: "France",
      city: "باريس",
      cityFr: "Paris",
      description:
        "مدينة النور والأناقة الخالدة. من برج إيفل الشامخ إلى متاحف اللوفر الأسطورية، ومن مقاهي الأحياء التاريخية إلى نزهة هادئة على ضفاف نهر السين، تبقى باريس وجهة يحلم بزيارتها الجميع، في أي عمر وفي أي فصل من فصول السنة.",
      descriptionFr:
        "La ville lumière à l'élégance intemporelle. De la tour Eiffel majestueuse aux musées légendaires du Louvre, des cafés des quartiers historiques à une promenade paisible sur les quais de la Seine, Paris reste une destination dont chacun rêve, à tout âge et en toute saison.",
      popularAttractions: [
        "برج إيفل",
        "متحف اللوفر",
        "شارع الشانزليزيه",
        "كاتدرائية نوتردام",
        "نهر السين",
      ],
      popularAttractionsFr: [
        "Tour Eiffel",
        "Musée du Louvre",
        "Avenue des Champs-Élysées",
        "Cathédrale Notre-Dame",
        "La Seine",
      ],
      heroImageKey: img.parisHero.key,
      heroImageUrl: img.parisHero.url,
      seoTitle: "رحلات إلى باريس | One To One",
      seoTitleFr: "Voyages à Paris | One To One",
      seoDescription: "باقات سياحية إلى باريس: إقامة فندقية مميزة، جولات ثقافية، وتذاكر للمعالم الأساسية.",
      seoDescriptionFr:
        "Séjours à Paris : hébergement de charme, circuits culturels et billets pour les sites incontournables.",
      status: "ACTIVE",
    },
  });

  const destDubai = await prisma.destination.create({
    data: {
      tenantId,
      name: "دبي",
      nameFr: "Dubaï",
      slug: "dubai",
      featured: true,
      country: "الإمارات العربية المتحدة",
      countryFr: "Émirats arabes unis",
      city: "دبي",
      cityFr: "Dubaï",
      description:
        "مدينة المستقبل التي تجمع بين الفخامة الحديثة وروح الصحراء العربية الأصيلة. من قمة برج خليفة الشاهقة إلى نافورة دبي الراقصة، ومن تسوق لا ينتهي في أكبر المولات إلى مغامرة صحراوية عند الغروب، تقدم دبي تجربة استثنائية لكل أفراد العائلة.",
      descriptionFr:
        "La ville du futur, alliant modernité luxueuse et âme authentique du désert arabe. Du sommet vertigineux du Burj Khalifa aux jeux d'eau de la fontaine de Dubaï, du shopping sans fin dans les plus grands centres commerciaux à une aventure dans le désert au coucher du soleil, Dubaï offre une expérience exceptionnelle pour toute la famille.",
      popularAttractions: [
        "برج خليفة",
        "نافورة دبي",
        "دبي مول",
        "سفاري صحراوي",
        "نخلة جميرا",
      ],
      popularAttractionsFr: [
        "Burj Khalifa",
        "Fontaine de Dubaï",
        "Dubai Mall",
        "Safari dans le désert",
        "Palm Jumeirah",
      ],
      heroImageKey: img.dubaiHero.key,
      heroImageUrl: img.dubaiHero.url,
      seoTitle: "رحلات إلى دبي | One To One",
      seoTitleFr: "Voyages à Dubaï | One To One",
      seoDescription: "استكشف دبي: إقامة فاخرة، سفاري صحراوي، وأجمل المعالم الحديثة في باقة واحدة.",
      seoDescriptionFr:
        "Explorez Dubaï : hébergement de luxe, safari dans le désert et les plus beaux sites modernes en un seul séjour.",
      status: "ACTIVE",
    },
  });

  await prisma.destination.create({
    data: {
      tenantId,
      name: "إسطنبول",
      nameFr: "Istanbul",
      slug: "istanbul",
      featured: true,
      country: "تركيا",
      countryFr: "Turquie",
      city: "إسطنبول",
      cityFr: "Istanbul",
      description:
        "المدينة الوحيدة في العالم التي تجمع بين قارتين. من قبة آيا صوفيا التاريخية إلى أسواق الغراند بازار العريقة، ومن جولة بحرية هادئة على مضيق البوسفور إلى مذاق القهوة التركية الأصيلة، تأخذك إسطنبول في رحلة عبر الزمن بين الشرق والغرب.",
      descriptionFr:
        "La seule ville au monde à cheval sur deux continents. Du dôme historique de Sainte-Sophie aux allées séculaires du Grand Bazar, d'une paisible croisière sur le Bosphore à la saveur authentique du café turc, Istanbul vous emmène dans un voyage à travers le temps, entre Orient et Occident.",
      popularAttractions: [
        "آيا صوفيا",
        "الجامع الأزرق",
        "الغراند بازار",
        "مضيق البوسفور",
        "قصر توبكابي",
      ],
      popularAttractionsFr: [
        "Sainte-Sophie",
        "Mosquée bleue",
        "Grand Bazar",
        "Détroit du Bosphore",
        "Palais de Topkapi",
      ],
      heroImageKey: img.istanbulHero.key,
      heroImageUrl: img.istanbulHero.url,
      seoTitle: "رحلات إلى إسطنبول | One To One",
      seoTitleFr: "Voyages à Istanbul | One To One",
      seoDescription: "باقات إلى إسطنبول: إقامة فندقية مختارة، جولة بحرية في البوسفور، وزيارة المعالم التاريخية.",
      seoDescriptionFr:
        "Séjours à Istanbul : hôtel sélectionné, croisière sur le Bosphore et visite des sites historiques.",
      status: "ACTIVE",
    },
  });

  // Extra Dubai landmark + desert gallery images attached to the destination.
  await prisma.destinationImage.createMany({
    data: [
      {
        tenantId,
        destinationId: destDubai.id,
        fileKey: img.dubaiLandmarkGallery.key,
        url: img.dubaiLandmarkGallery.url,
        alt: "معالم دبي الشهيرة",
        altFr: "Sites emblématiques de Dubaï",
        position: 0,
      },
      {
        tenantId,
        destinationId: destDubai.id,
        fileKey: img.dubaiDesertGallery.key,
        url: img.dubaiDesertGallery.url,
        alt: "مغامرة في صحراء دبي",
        altFr: "Aventure dans le désert de Dubaï",
        position: 1,
      },
    ],
  });

  console.log("Destinations created.");

  // ---------------------------------------------------------------------
  // Hotels
  // ---------------------------------------------------------------------
  const hotelMarrakech = await prisma.hotel.create({
    data: {
      tenantId,
      name: "رياض أطلس مراكش",
      nameFr: "Riad Atlas Marrakech",
      slug: "riad-atlas-marrakech",
      featured: true,
      category: "RIAD",
      stars: 5,
      country: "المغرب",
      countryFr: "Maroc",
      city: "مراكش",
      cityFr: "Marrakech",
      description:
        "رياض تقليدي فاخر في قلب المدينة القديمة، يجمع بين العمارة المغربية الأصيلة وأسباب الراحة العصرية. فناء داخلي مورق، مسبح على السطح بإطلالة على جبال الأطلس، وخدمة شخصية تجعل كل إقامة تجربة استثنائية.",
      descriptionFr:
        "Un riad traditionnel de luxe au cœur de la médina, alliant architecture marocaine authentique et confort moderne. Patio intérieur verdoyant, piscine sur le toit avec vue sur l'Atlas, et un service personnalisé qui fait de chaque séjour une expérience exceptionnelle.",
      amenities: [
        "مسبح على السطح",
        "فناء تقليدي مغربي",
        "إفطار مغربي أصيل",
        "سبا وحمام مغربي",
        "واي فاي مجاني",
        "خدمة الغرف على مدار الساعة",
      ],
      amenitiesFr: [
        "Piscine sur le toit",
        "Patio marocain traditionnel",
        "Petit-déjeuner marocain authentique",
        "Spa et hammam",
        "Wi-Fi gratuit",
        "Service en chambre 24h/24",
      ],
      coverImageKey: img.marrakechHotel.key,
      coverImageUrl: img.marrakechHotel.url,
      status: "ACTIVE",
    },
  });

  const hotelParis = await prisma.hotel.create({
    data: {
      tenantId,
      name: "فندق لو ماريه باريس",
      nameFr: "Hôtel Le Marais Paris",
      slug: "hotel-le-marais-paris",
      featured: true,
      category: "BOUTIQUE",
      stars: 4,
      country: "فرنسا",
      countryFr: "France",
      city: "باريس",
      cityFr: "Paris",
      description:
        "فندق بوتيك أنيق في حي تاريخي بقلب باريس، على بعد خطوات من أهم المعالم السياحية. تصميم داخلي عصري بلمسة باريسية كلاسيكية، وشرفات خاصة تطل على الأزقة الهادئة المحاطة بالعمارة الهوسمانية.",
      descriptionFr:
        "Un élégant hôtel boutique dans un quartier historique au cœur de Paris, à quelques pas des sites incontournables. Une décoration moderne à la touche parisienne classique, avec des balcons privés donnant sur des rues calmes bordées d'immeubles haussmanniens.",
      amenities: [
        "إفطار فرنسي فاخر",
        "واي فاي مجاني",
        "كونسيرج على مدار الساعة",
        "تصميم داخلي أنيق",
        "قرب من المعالم السياحية",
      ],
      amenitiesFr: [
        "Petit-déjeuner français raffiné",
        "Wi-Fi gratuit",
        "Conciergerie 24h/24",
        "Décoration intérieure élégante",
        "Proche des sites touristiques",
      ],
      coverImageKey: img.parisHotel.key,
      coverImageUrl: img.parisHotel.url,
      status: "ACTIVE",
    },
  });

  const hotelDubai = await prisma.hotel.create({
    data: {
      tenantId,
      name: "فندق مارينا دبي الفاخر",
      nameFr: "Hôtel Dubai Marina Luxe",
      slug: "hotel-dubai-marina-luxe",
      featured: true,
      category: "RESORT",
      stars: 5,
      country: "الإمارات العربية المتحدة",
      countryFr: "Émirats arabes unis",
      city: "دبي",
      cityFr: "Dubaï",
      description:
        "فندق فاخر يطل مباشرة على واجهة مارينا دبي المائية، بين ناطحات السحاب والمراكب الشراعية. مسابح متعددة، شاطئ خاص، ومطاعم عالمية على بعد خطوات، في تجربة إقامة تجمع بين الرفاهية والحيوية.",
      descriptionFr:
        "Un hôtel de luxe donnant directement sur la promenade de Dubai Marina, entre gratte-ciels et yachts. Plusieurs piscines, plage privée, et restaurants internationaux à quelques pas, pour un séjour alliant raffinement et effervescence.",
      amenities: [
        "مسبح خارجي بإطلالة على المارينا",
        "شاطئ خاص",
        "نادي صحي ومركز لياقة",
        "مطاعم عالمية",
        "واي فاي مجاني",
        "خدمة السيارات والنقل الخاص",
      ],
      amenitiesFr: [
        "Piscine extérieure vue marina",
        "Plage privée",
        "Spa et salle de sport",
        "Restaurants internationaux",
        "Wi-Fi gratuit",
        "Service voiturier et transferts privés",
      ],
      coverImageKey: img.dubaiHotel.key,
      coverImageUrl: img.dubaiHotel.url,
      status: "ACTIVE",
    },
  });

  const hotelIstanbul = await prisma.hotel.create({
    data: {
      tenantId,
      name: "فندق بوسفور بيرل إسطنبول",
      nameFr: "Hôtel Bosphorus Pearl Istanbul",
      slug: "hotel-bosphorus-pearl-istanbul",
      featured: true,
      category: "BOUTIQUE",
      stars: 4,
      country: "تركيا",
      countryFr: "Turquie",
      city: "إسطنبول",
      cityFr: "Istanbul",
      description:
        "فندق بوتيك أنيق يجمع بين الطراز العثماني الأصيل ووسائل الراحة الحديثة، على مقربة من أهم معالم إسطنبول التاريخية. غرف واسعة بديكور دافئ، وخدمة ضيافة تركية أصيلة من اللحظة الأولى.",
      descriptionFr:
        "Un hôtel boutique élégant alliant style ottoman authentique et confort moderne, à proximité des principaux sites historiques d'Istanbul. Chambres spacieuses à la décoration chaleureuse, et une hospitalité turque authentique dès votre arrivée.",
      amenities: [
        "إفطار تركي تقليدي",
        "قرب من آيا صوفيا والجامع الأزرق",
        "واي فاي مجاني",
        "حمام تركي (حمّام)",
        "مطعم على السطح",
      ],
      amenitiesFr: [
        "Petit-déjeuner turc traditionnel",
        "Proche de Sainte-Sophie et de la Mosquée bleue",
        "Wi-Fi gratuit",
        "Hammam turc",
        "Restaurant sur le toit",
      ],
      coverImageKey: img.istanbulHotel.key,
      coverImageUrl: img.istanbulHotel.url,
      status: "ACTIVE",
    },
  });

  await prisma.roomType.createMany({
    data: [
      {
        tenantId,
        hotelId: hotelMarrakech.id,
        kind: "DELUXE",
        name: "غرفة ديلوكس بفناء",
        nameFr: "Chambre Deluxe avec vue patio",
        capacity: 2,
        beds: 1,
        basePrice: 120,
        currency: "USD",
        images: [],
      },
      {
        tenantId,
        hotelId: hotelMarrakech.id,
        kind: "SUITE",
        name: "جناح رياض فاخر",
        nameFr: "Suite Riad de luxe",
        capacity: 3,
        beds: 2,
        basePrice: 220,
        currency: "USD",
        images: [],
      },
      {
        tenantId,
        hotelId: hotelParis.id,
        kind: "STANDARD",
        name: "غرفة كلاسيكية",
        nameFr: "Chambre Classique",
        capacity: 2,
        beds: 1,
        basePrice: 180,
        currency: "USD",
        images: [],
      },
      {
        tenantId,
        hotelId: hotelParis.id,
        kind: "DELUXE",
        name: "غرفة ديلوكس بشرفة",
        nameFr: "Chambre Deluxe avec balcon",
        capacity: 2,
        beds: 1,
        basePrice: 260,
        currency: "USD",
        images: [],
      },
      {
        tenantId,
        hotelId: hotelDubai.id,
        kind: "DELUXE",
        name: "غرفة ديلوكس بإطلالة على المارينا",
        nameFr: "Chambre Deluxe vue marina",
        capacity: 2,
        beds: 1,
        basePrice: 240,
        currency: "USD",
        images: [],
      },
      {
        tenantId,
        hotelId: hotelDubai.id,
        kind: "SUITE",
        name: "جناح تنفيذي",
        nameFr: "Suite Exécutive",
        capacity: 3,
        beds: 2,
        basePrice: 420,
        currency: "USD",
        images: [],
      },
      {
        tenantId,
        hotelId: hotelIstanbul.id,
        kind: "STANDARD",
        name: "غرفة كلاسيكية عثمانية",
        nameFr: "Chambre Classique Ottomane",
        capacity: 2,
        beds: 1,
        basePrice: 95,
        currency: "USD",
        images: [],
      },
      {
        tenantId,
        hotelId: hotelIstanbul.id,
        kind: "DELUXE",
        name: "غرفة ديلوكس بإطلالة على البوسفور",
        nameFr: "Chambre Deluxe vue Bosphore",
        capacity: 2,
        beds: 1,
        basePrice: 150,
        currency: "USD",
        images: [],
      },
    ],
  });

  console.log("Hotels and room types created.");

  // ---------------------------------------------------------------------
  // Flights
  // ---------------------------------------------------------------------
  await prisma.flight.createMany({
    data: [
      {
        tenantId,
        name: "الجزائر → مراكش",
        nameFr: "Alger → Marrakech",
        slug: "algiers-marrakech",
        featured: false,
        shortDescription: "رحلة داخلية سريعة ومباشرة",
        shortDescriptionFr: "Vol intérieur rapide et direct",
        airline: "الخطوط الجوية الجزائرية",
        departureCity: "الجزائر",
        departureCityFr: "Alger",
        departureAirport: "مطار هواري بومدين الدولي",
        departureAirportFr: "Aéroport international Houari Boumediene",
        departureCountry: "المغرب",
        departureCountryFr: "Maroc",
        arrivalCity: "مراكش",
        arrivalCityFr: "Marrakech",
        arrivalAirport: "مطار مراكش المنارة",
        arrivalAirportFr: "Aéroport Marrakech Ménara",
        arrivalCountry: "المغرب",
        arrivalCountryFr: "Maroc",
        departureTime: "09:00",
        arrivalTime: "10:05",
        durationMinutes: 65,
        stops: 0,
        cabinClass: "اقتصادي",
        cabinClassFr: "Économique",
        basePrice: 89,
        currency: "USD",
        coverImageKey: img.marrakechHero.key,
        coverImageUrl: img.marrakechHero.url,
        status: "PUBLISHED",
      },
      {
        tenantId,
        name: "الجزائر → باريس",
        nameFr: "Alger → Paris",
        slug: "algiers-paris",
        featured: true,
        shortDescription: "رحلة مباشرة نحو مدينة النور",
        shortDescriptionFr: "Vol direct vers la ville lumière",
        airline: "الخطوط الجوية الجزائرية",
        departureCity: "الجزائر",
        departureCityFr: "Alger",
        departureAirport: "مطار هواري بومدين الدولي",
        departureAirportFr: "Aéroport international Houari Boumediene",
        departureCountry: "المغرب",
        departureCountryFr: "Maroc",
        arrivalCity: "باريس",
        arrivalCityFr: "Paris",
        arrivalAirport: "مطار شارل ديغول",
        arrivalAirportFr: "Aéroport Charles de Gaulle",
        arrivalCountry: "فرنسا",
        arrivalCountryFr: "France",
        departureTime: "13:30",
        arrivalTime: "17:00",
        durationMinutes: 210,
        stops: 0,
        cabinClass: "اقتصادي",
        cabinClassFr: "Économique",
        basePrice: 349,
        currency: "USD",
        coverImageKey: img.parisHero.key,
        coverImageUrl: img.parisHero.url,
        status: "PUBLISHED",
      },
      {
        tenantId,
        name: "الجزائر → دبي",
        nameFr: "Alger → Dubaï",
        slug: "algiers-dubai",
        featured: true,
        shortDescription: "رحلة مباشرة نحو مدينة المستقبل",
        shortDescriptionFr: "Vol direct vers la ville du futur",
        airline: "الخطوط الجوية الجزائرية",
        departureCity: "الجزائر",
        departureCityFr: "Alger",
        departureAirport: "مطار هواري بومدين الدولي",
        departureAirportFr: "Aéroport international Houari Boumediene",
        departureCountry: "المغرب",
        departureCountryFr: "Maroc",
        arrivalCity: "دبي",
        arrivalCityFr: "Dubaï",
        arrivalAirport: "مطار دبي الدولي",
        arrivalAirportFr: "Aéroport international de Dubaï",
        arrivalCountry: "الإمارات العربية المتحدة",
        arrivalCountryFr: "Émirats arabes unis",
        departureTime: "23:15",
        arrivalTime: "08:45",
        durationMinutes: 450,
        stops: 0,
        cabinClass: "اقتصادي",
        cabinClassFr: "Économique",
        basePrice: 459,
        currency: "USD",
        coverImageKey: img.dubaiHero.key,
        coverImageUrl: img.dubaiHero.url,
        status: "PUBLISHED",
      },
      {
        tenantId,
        name: "الجزائر → إسطنبول",
        nameFr: "Alger → Istanbul",
        slug: "algiers-istanbul",
        featured: true,
        shortDescription: "رحلة مباشرة نحو ملتقى القارتين",
        shortDescriptionFr: "Vol direct vers le carrefour des continents",
        airline: "الخطوط الجوية الجزائرية",
        departureCity: "الجزائر",
        departureCityFr: "Alger",
        departureAirport: "مطار هواري بومدين الدولي",
        departureAirportFr: "Aéroport international Houari Boumediene",
        departureCountry: "المغرب",
        departureCountryFr: "Maroc",
        arrivalCity: "إسطنبول",
        arrivalCityFr: "Istanbul",
        arrivalAirport: "مطار إسطنبول الجديد",
        arrivalAirportFr: "Aéroport d'Istanbul",
        arrivalCountry: "تركيا",
        arrivalCountryFr: "Turquie",
        departureTime: "10:20",
        arrivalTime: "16:50",
        durationMinutes: 390,
        stops: 0,
        cabinClass: "اقتصادي",
        cabinClassFr: "Économique",
        basePrice: 329,
        currency: "USD",
        coverImageKey: img.istanbulHero.key,
        coverImageUrl: img.istanbulHero.url,
        status: "PUBLISHED",
      },
    ],
  });

  console.log("Flights created.");

  // ---------------------------------------------------------------------
  // Packages
  // ---------------------------------------------------------------------
  const pkgMarrakech = await prisma.package.create({
    data: {
      tenantId,
      name: "استكشاف مراكش الإمبراطورية",
      nameFr: "Découverte Impériale de Marrakech",
      slug: "marrakech-imperial-discovery",
      featured: true,
      shortDescription: "أربعة أيام بين أسوار المدينة الحمراء وحدائق ماجوريل وسحر جبال الأطلس",
      shortDescriptionFr:
        "Quatre jours entre les remparts de la ville ocre, le Jardin Majorelle et la magie de l'Atlas",
      description:
        "رحلة من أربعة أيام تأخذكم في قلب مراكش النابضة بالحياة: من متاهة أزقة المدينة القديمة وساحتها الشهيرة، إلى هدوء حدائق ماجوريل الزرقاء، وصولًا إلى جولة استثنائية في جبال الأطلس. إقامة في رياض تقليدي فاخر، وتجربة حمام مغربي أصيل، وأمسية عشاء بنكهة الضيافة المغربية الحقيقية.",
      descriptionFr:
        "Un séjour de quatre jours au cœur de Marrakech, vibrante de vie : du labyrinthe de ruelles de la médina et sa place emblématique, à la sérénité bleue du Jardin Majorelle, jusqu'à une excursion exceptionnelle dans les montagnes de l'Atlas. Hébergement dans un riad traditionnel de luxe, expérience de hammam authentique, et une soirée à la saveur de la véritable hospitalité marocaine.",
      destination: "مراكش",
      destinationFr: "Marrakech",
      country: "المغرب",
      countryFr: "Maroc",
      duration: 4,
      durationNights: 3,
      category: "ثقافي وتاريخي",
      categoryFr: "Culturel et historique",
      difficulty: "EASY",
      sellingPrice: 799,
      internalCost: 540,
      currency: "USD",
      highlights: [
        "جولة معمقة في المدينة القديمة وساحة جامع الفنا",
        "زيارة حدائق ماجوريل الشهيرة",
        "تجربة حمام مغربي تقليدي واسترخاء",
        "عشاء مغربي أصيل مع عرض فلكلوري",
        "رحلة يوم كامل إلى جبال الأطلس",
      ],
      highlightsFr: [
        "Visite approfondie de la médina et de la place Jemaa el-Fna",
        "Visite du célèbre Jardin Majorelle",
        "Expérience de hammam marocain traditionnel",
        "Dîner marocain authentique avec spectacle folklorique",
        "Excursion d'une journée complète dans l'Atlas",
      ],
      includedServices: [
        "الإقامة 3 ليالٍ في رياض فاخر",
        "وجبة الإفطار يوميًا",
        "النقل من وإلى المطار",
        "مرشد سياحي ناطق بالعربية والفرنسية",
        "جولة يوم كامل في جبال الأطلس مع الغداء",
      ],
      includedServicesFr: [
        "Hébergement 3 nuits dans un riad de luxe",
        "Petit-déjeuner quotidien",
        "Transferts aéroport aller-retour",
        "Guide touristique arabophone et francophone",
        "Excursion d'une journée dans l'Atlas avec déjeuner",
      ],
      excludedServices: [
        "تذاكر الطيران الدولية",
        "التأمين الشخصي على السفر",
        "المصاريف الشخصية",
        "الوجبات غير المذكورة في البرنامج",
      ],
      excludedServicesFr: [
        "Billets d'avion internationaux",
        "Assurance voyage personnelle",
        "Dépenses personnelles",
        "Repas non mentionnés au programme",
      ],
      importantNotes: [
        "يُفضل الحجز قبل 3 أسابيع من تاريخ السفر لضمان التوفر",
        "الأسعار قابلة للتغيير حسب الموسم وتوفر الإقامة",
      ],
      importantNotesFr: [
        "Réservation recommandée 3 semaines avant le départ pour garantir la disponibilité",
        "Tarifs sujets à modification selon la saison et la disponibilité",
      ],
      whatToBring: [
        "ملابس مريحة للمشي الطويل",
        "واقي شمس وقبعة",
        "حذاء رياضي مريح",
        "كاميرا لتوثيق اللحظات",
      ],
      whatToBringFr: [
        "Vêtements confortables pour la marche",
        "Crème solaire et chapeau",
        "Chaussures de marche confortables",
        "Appareil photo",
      ],
      cancellationPolicy:
        "يمكن الإلغاء مجانًا حتى 7 أيام قبل تاريخ الرحلة. بعد ذلك تُطبق رسوم إلغاء بنسبة 50%. لا يوجد استرجاع خلال 48 ساعة من تاريخ المغادرة.",
      cancellationPolicyFr:
        "Annulation gratuite jusqu'à 7 jours avant le départ. Passé ce délai, des frais d'annulation de 50% s'appliquent. Aucun remboursement dans les 48 heures précédant le départ.",
      meetingPoint: "مطار مراكش المنارة",
      meetingPointFr: "Aéroport Marrakech Ménara",
      seoTitle: "باقة مراكش الإمبراطورية 4 أيام | One To One",
      seoTitleFr: "Séjour Impérial à Marrakech 4 jours | One To One",
      seoDescription: "باقة 4 أيام في مراكش: رياض فاخر، حدائق ماجوريل، وجولة في جبال الأطلس.",
      seoDescriptionFr: "Séjour de 4 jours à Marrakech : riad de luxe, Jardin Majorelle et excursion dans l'Atlas.",
      status: "PUBLISHED",
    },
  });

  const pkgParis = await prisma.package.create({
    data: {
      tenantId,
      name: "باريس بين الأناقة والسحر",
      nameFr: "Paris, Élégance et Enchantement",
      slug: "paris-elegance-enchantment",
      featured: true,
      shortDescription: "خمسة أيام في مدينة النور: برج إيفل، اللوفر، وفرساي",
      shortDescriptionFr: "Cinq jours dans la ville lumière : Tour Eiffel, Louvre et Versailles",
      description:
        "خمسة أيام لاكتشاف أجمل ما في باريس: جولة نهرية على متن قارب في نهر السين أمام برج إيفل المضيء، زيارة خاصة لمتحف اللوفر برفقة مرشد متخصص، نزهة على شارع الشانزليزيه الشهير، ويوم كامل في قصر فرساي التاريخي. إقامة في فندق بوتيك أنيق بقلب المدينة.",
      descriptionFr:
        "Cinq jours pour découvrir le meilleur de Paris : croisière en bateau sur la Seine face à la tour Eiffel illuminée, visite privée du musée du Louvre avec un guide spécialisé, promenade sur la célèbre avenue des Champs-Élysées, et une journée complète au château de Versailles. Hébergement dans un élégant hôtel boutique au cœur de la ville.",
      destination: "باريس",
      destinationFr: "Paris",
      country: "فرنسا",
      countryFr: "France",
      duration: 5,
      durationNights: 4,
      category: "رومانسي وثقافي",
      categoryFr: "Romantique et culturel",
      difficulty: "EASY",
      sellingPrice: 1499,
      internalCost: 1080,
      currency: "USD",
      highlights: [
        "جولة نهرية في السين أمام برج إيفل",
        "زيارة خاصة لمتحف اللوفر مع مرشد",
        "نزهة على شارع الشانزليزيه",
        "يوم كامل في قصر فرساي",
        "عشاء فرنسي فاخر في مطعم مختار",
      ],
      highlightsFr: [
        "Croisière sur la Seine face à la tour Eiffel",
        "Visite privée du Louvre avec guide",
        "Promenade sur les Champs-Élysées",
        "Journée complète au château de Versailles",
        "Dîner gastronomique français dans un restaurant sélectionné",
      ],
      includedServices: [
        "الإقامة 4 ليالٍ في فندق بوتيك 4 نجوم",
        "وجبة الإفطار يوميًا",
        "تذاكر الدخول لمتحف اللوفر وقصر فرساي",
        "جولة نهرية في السين",
        "مرشد سياحي ناطق بالعربية والفرنسية",
      ],
      includedServicesFr: [
        "Hébergement 4 nuits en hôtel boutique 4 étoiles",
        "Petit-déjeuner quotidien",
        "Billets d'entrée au Louvre et à Versailles",
        "Croisière sur la Seine",
        "Guide touristique arabophone et francophone",
      ],
      excludedServices: [
        "تذاكر الطيران الدولية",
        "التأمين الشخصي على السفر",
        "المصاريف الشخصية والتسوق",
        "الوجبات غير المذكورة في البرنامج",
      ],
      excludedServicesFr: [
        "Billets d'avion internationaux",
        "Assurance voyage personnelle",
        "Dépenses personnelles et shopping",
        "Repas non mentionnés au programme",
      ],
      importantNotes: [
        "يُنصح بالحجز المبكر خاصة خلال موسم الصيف",
        "زيارة قصر فرساي تتطلب حجزًا مسبقًا للتذاكر",
      ],
      importantNotesFr: [
        "Réservation anticipée recommandée, surtout en saison estivale",
        "La visite de Versailles nécessite une réservation de billets à l'avance",
      ],
      whatToBring: [
        "ملابس مناسبة للطقس الأوروبي",
        "حذاء مريح للمشي",
        "مظلة صغيرة",
        "كاميرا لتوثيق الرحلة",
      ],
      whatToBringFr: [
        "Vêtements adaptés au climat européen",
        "Chaussures confortables pour la marche",
        "Petit parapluie",
        "Appareil photo",
      ],
      cancellationPolicy:
        "يمكن الإلغاء مجانًا حتى 10 أيام قبل تاريخ الرحلة. بعد ذلك تُطبق رسوم إلغاء بنسبة 50%. لا يوجد استرجاع خلال 72 ساعة من تاريخ المغادرة.",
      cancellationPolicyFr:
        "Annulation gratuite jusqu'à 10 jours avant le départ. Passé ce délai, des frais d'annulation de 50% s'appliquent. Aucun remboursement dans les 72 heures précédant le départ.",
      meetingPoint: "مطار شارل ديغول، باريس",
      meetingPointFr: "Aéroport Charles de Gaulle, Paris",
      seoTitle: "باقة باريس 5 أيام | One To One",
      seoTitleFr: "Séjour à Paris 5 jours | One To One",
      seoDescription: "باقة 5 أيام في باريس: برج إيفل، متحف اللوفر، وقصر فرساي.",
      seoDescriptionFr: "Séjour de 5 jours à Paris : Tour Eiffel, Louvre et château de Versailles.",
      status: "PUBLISHED",
    },
  });

  const pkgDubai = await prisma.package.create({
    data: {
      tenantId,
      name: "دبي.. رفاهية بلا حدود",
      nameFr: "Dubaï, Luxe sans Limites",
      slug: "dubai-luxury-unlimited",
      featured: true,
      shortDescription: "خمسة أيام بين ناطحات السحاب وسحر الصحراء العربية",
      shortDescriptionFr: "Cinq jours entre gratte-ciels et magie du désert arabe",
      description:
        "خمسة أيام في مدينة الرفاهية: صعود إلى قمة برج خليفة، مغامرة صحراوية عند الغروب مع عشاء بدوي أصيل، تسوق في أكبر المولات العالمية، وإقامة فاخرة في فندق يطل على مارينا دبي. تجربة متكاملة تجمع بين الحداثة والأصالة.",
      descriptionFr:
        "Cinq jours dans la ville du luxe : ascension au sommet du Burj Khalifa, aventure dans le désert au coucher du soleil avec dîner bédouin authentique, shopping dans les plus grands centres commerciaux du monde, et hébergement luxueux dans un hôtel donnant sur Dubai Marina. Une expérience complète entre modernité et authenticité.",
      destination: "دبي",
      destinationFr: "Dubaï",
      country: "الإمارات العربية المتحدة",
      countryFr: "Émirats arabes unis",
      duration: 5,
      durationNights: 4,
      category: "فاخر ومغامرات",
      categoryFr: "Luxe et aventure",
      difficulty: "EASY",
      sellingPrice: 1899,
      internalCost: 1350,
      currency: "USD",
      highlights: [
        "صعود إلى قمة برج خليفة",
        "سفاري صحراوي مع عشاء بدوي وعروض فلكلورية",
        "جولة في نافورة دبي ودبي مول",
        "يوم استرخاء في مسبح الفندق المطل على المارينا",
        "جولة بحرية تقليدية (عبرة) في خور دبي",
      ],
      highlightsFr: [
        "Ascension au sommet du Burj Khalifa",
        "Safari dans le désert avec dîner bédouin et spectacles folkloriques",
        "Visite de la fontaine de Dubaï et du Dubai Mall",
        "Journée détente à la piscine de l'hôtel vue marina",
        "Croisière traditionnelle (abra) sur la crique de Dubaï",
      ],
      includedServices: [
        "الإقامة 4 ليالٍ في فندق 5 نجوم بإطلالة على المارينا",
        "وجبة الإفطار يوميًا",
        "تذكرة صعود برج خليفة",
        "رحلة سفاري صحراوي مع العشاء",
        "النقل من وإلى المطار",
      ],
      includedServicesFr: [
        "Hébergement 4 nuits en hôtel 5 étoiles vue marina",
        "Petit-déjeuner quotidien",
        "Billet d'accès au sommet du Burj Khalifa",
        "Safari dans le désert avec dîner",
        "Transferts aéroport aller-retour",
      ],
      excludedServices: [
        "تذاكر الطيران الدولية",
        "التأمين الشخصي على السفر",
        "المصاريف الشخصية والتسوق",
        "الوجبات غير المذكورة في البرنامج",
      ],
      excludedServicesFr: [
        "Billets d'avion internationaux",
        "Assurance voyage personnelle",
        "Dépenses personnelles et shopping",
        "Repas non mentionnés au programme",
      ],
      importantNotes: [
        "يُنصح بارتداء ملابس محتشمة عند زيارة الأماكن العامة والمساجد",
        "درجات الحرارة قد تكون مرتفعة جدًا في فصل الصيف",
      ],
      importantNotesFr: [
        "Tenue modeste recommandée dans les lieux publics et les mosquées",
        "Les températures peuvent être très élevées en été",
      ],
      whatToBring: [
        "ملابس خفيفة ومريحة",
        "ملابس سباحة",
        "واقي شمس بدرجة حماية عالية",
        "نظارات شمسية وقبعة",
      ],
      whatToBringFr: [
        "Vêtements légers et confortables",
        "Maillot de bain",
        "Crème solaire haute protection",
        "Lunettes de soleil et chapeau",
      ],
      cancellationPolicy:
        "يمكن الإلغاء مجانًا حتى 7 أيام قبل تاريخ الرحلة. بعد ذلك تُطبق رسوم إلغاء بنسبة 50%. لا يوجد استرجاع خلال 48 ساعة من تاريخ المغادرة.",
      cancellationPolicyFr:
        "Annulation gratuite jusqu'à 7 jours avant le départ. Passé ce délai, des frais d'annulation de 50% s'appliquent. Aucun remboursement dans les 48 heures précédant le départ.",
      meetingPoint: "مطار دبي الدولي",
      meetingPointFr: "Aéroport international de Dubaï",
      seoTitle: "باقة دبي الفاخرة 5 أيام | One To One",
      seoTitleFr: "Séjour de Luxe à Dubaï 5 jours | One To One",
      seoDescription: "باقة 5 أيام في دبي: برج خليفة، سفاري صحراوي، وإقامة فاخرة على المارينا.",
      seoDescriptionFr: "Séjour de 5 jours à Dubaï : Burj Khalifa, safari désertique et hôtel de luxe sur la marina.",
      status: "PUBLISHED",
    },
  });

  const pkgIstanbul = await prisma.package.create({
    data: {
      tenantId,
      name: "إسطنبول.. ملتقى القارتين",
      nameFr: "Istanbul, Carrefour des Continents",
      slug: "istanbul-crossroads-continents",
      featured: true,
      shortDescription: "أربعة أيام بين تاريخ آيا صوفيا وسحر مضيق البوسفور",
      shortDescriptionFr: "Quatre jours entre l'histoire de Sainte-Sophie et la magie du Bosphore",
      description:
        "أربعة أيام لاكتشاف إسطنبول الساحرة: زيارة آيا صوفيا والجامع الأزرق، تجربة تسوق أصيلة في الغراند بازار، جولة بحرية هادئة على مضيق البوسفور بين قارتي آسيا وأوروبا، وإقامة في فندق بوتيك بطراز عثماني أنيق.",
      descriptionFr:
        "Quatre jours pour découvrir la fascinante Istanbul : visite de Sainte-Sophie et de la Mosquée bleue, expérience shopping authentique au Grand Bazar, paisible croisière sur le Bosphore entre l'Asie et l'Europe, et hébergement dans un élégant hôtel boutique de style ottoman.",
      destination: "إسطنبول",
      destinationFr: "Istanbul",
      country: "تركيا",
      countryFr: "Turquie",
      duration: 4,
      durationNights: 3,
      category: "تاريخي وثقافي",
      categoryFr: "Historique et culturel",
      difficulty: "EASY",
      sellingPrice: 999,
      internalCost: 690,
      currency: "USD",
      highlights: [
        "زيارة آيا صوفيا والجامع الأزرق",
        "جولة تسوق في الغراند بازار",
        "رحلة بحرية على مضيق البوسفور",
        "زيارة قصر توبكابي التاريخي",
        "أمسية شاي تركي أصيلة بإطلالة على البوسفور",
      ],
      highlightsFr: [
        "Visite de Sainte-Sophie et de la Mosquée bleue",
        "Shopping au Grand Bazar",
        "Croisière sur le Bosphore",
        "Visite du palais historique de Topkapi",
        "Soirée thé turc authentique avec vue sur le Bosphore",
      ],
      includedServices: [
        "الإقامة 3 ليالٍ في فندق بوتيك 4 نجوم",
        "وجبة الإفطار يوميًا",
        "جولة بحرية في البوسفور",
        "مرشد سياحي ناطق بالعربية",
        "النقل من وإلى المطار",
      ],
      includedServicesFr: [
        "Hébergement 3 nuits en hôtel boutique 4 étoiles",
        "Petit-déjeuner quotidien",
        "Croisière sur le Bosphore",
        "Guide touristique arabophone",
        "Transferts aéroport aller-retour",
      ],
      excludedServices: [
        "تذاكر الطيران الدولية",
        "التأمين الشخصي على السفر",
        "المصاريف الشخصية والتسوق",
        "الوجبات غير المذكورة في البرنامج",
      ],
      excludedServicesFr: [
        "Billets d'avion internationaux",
        "Assurance voyage personnelle",
        "Dépenses personnelles et shopping",
        "Repas non mentionnés au programme",
      ],
      importantNotes: [
        "يُنصح بتغطية الرأس والكتفين عند زيارة المساجد",
        "يُفضل الحجز المبكر خلال المواسم السياحية",
      ],
      importantNotesFr: [
        "Se couvrir la tête et les épaules recommandé lors des visites de mosquées",
        "Réservation anticipée conseillée en haute saison",
      ],
      whatToBring: [
        "ملابس محتشمة لزيارة المساجد",
        "حذاء مريح للمشي",
        "معطف خفيف حسب الموسم",
        "كاميرا لتوثيق الرحلة",
      ],
      whatToBringFr: [
        "Tenue modeste pour la visite des mosquées",
        "Chaussures confortables pour la marche",
        "Veste légère selon la saison",
        "Appareil photo",
      ],
      cancellationPolicy:
        "يمكن الإلغاء مجانًا حتى 7 أيام قبل تاريخ الرحلة. بعد ذلك تُطبق رسوم إلغاء بنسبة 50%. لا يوجد استرجاع خلال 48 ساعة من تاريخ المغادرة.",
      cancellationPolicyFr:
        "Annulation gratuite jusqu'à 7 jours avant le départ. Passé ce délai, des frais d'annulation de 50% s'appliquent. Aucun remboursement dans les 48 heures précédant le départ.",
      meetingPoint: "مطار إسطنبول الجديد",
      meetingPointFr: "Aéroport d'Istanbul",
      seoTitle: "باقة إسطنبول 4 أيام | One To One",
      seoTitleFr: "Séjour à Istanbul 4 jours | One To One",
      seoDescription: "باقة 4 أيام في إسطنبول: آيا صوفيا، الغراند بازار، وجولة بحرية في البوسفور.",
      seoDescriptionFr: "Séjour de 4 jours à Istanbul : Sainte-Sophie, Grand Bazar et croisière sur le Bosphore.",
      status: "PUBLISHED",
    },
  });

  console.log("Packages created.");

  // Cover + gallery images for each package (reusing sourced photography).
  await prisma.package.update({
    where: { id: pkgMarrakech.id },
    data: { coverImageKey: img.marrakechHero.key, coverImageUrl: img.marrakechHero.url },
  });
  await prisma.package.update({
    where: { id: pkgParis.id },
    data: { coverImageKey: img.parisHero.key, coverImageUrl: img.parisHero.url },
  });
  await prisma.package.update({
    where: { id: pkgDubai.id },
    data: { coverImageKey: img.dubaiHero.key, coverImageUrl: img.dubaiHero.url },
  });
  await prisma.package.update({
    where: { id: pkgIstanbul.id },
    data: { coverImageKey: img.istanbulHero.key, coverImageUrl: img.istanbulHero.url },
  });

  await prisma.packageImage.createMany({
    data: [
      {
        tenantId,
        packageId: pkgMarrakech.id,
        fileKey: img.marrakechHotel.key,
        url: img.marrakechHotel.url,
        alt: "أمسية على سطح الرياض",
        altFr: "Soirée sur la terrasse du riad",
        position: 0,
      },
      {
        tenantId,
        packageId: pkgParis.id,
        fileKey: img.parisHotel.key,
        url: img.parisHotel.url,
        alt: "إفطار على شرفة باريسية",
        altFr: "Petit-déjeuner sur un balcon parisien",
        position: 0,
      },
      {
        tenantId,
        packageId: pkgDubai.id,
        fileKey: img.dubaiDesertGallery.key,
        url: img.dubaiDesertGallery.url,
        alt: "مغامرة في الصحراء",
        altFr: "Aventure dans le désert",
        position: 0,
      },
      {
        tenantId,
        packageId: pkgDubai.id,
        fileKey: img.dubaiLandmarkGallery.key,
        url: img.dubaiLandmarkGallery.url,
        alt: "إطلالة داخلية فاخرة في دبي",
        altFr: "Intérieur luxueux à Dubaï",
        position: 1,
      },
      {
        tenantId,
        packageId: pkgIstanbul.id,
        fileKey: img.istanbulHotel.key,
        url: img.istanbulHotel.url,
        alt: "غرفة فندقية أنيقة في إسطنبول",
        altFr: "Chambre d'hôtel élégante à Istanbul",
        position: 0,
      },
    ],
  });

  // Link each package to its hotel.
  await prisma.packageHotel.createMany({
    data: [
      { tenantId, packageId: pkgMarrakech.id, hotelId: hotelMarrakech.id, position: 0 },
      { tenantId, packageId: pkgParis.id, hotelId: hotelParis.id, position: 0 },
      { tenantId, packageId: pkgDubai.id, hotelId: hotelDubai.id, position: 0 },
      { tenantId, packageId: pkgIstanbul.id, hotelId: hotelIstanbul.id, position: 0 },
    ],
  });

  // ---------------------------------------------------------------------
  // Itineraries
  // ---------------------------------------------------------------------
  const itineraries = [
    {
      packageId: pkgMarrakech.id,
      days: [
        {
          title: "الوصول والتعرف على المدينة القديمة",
          titleFr: "Arrivée et découverte de la médina",
          description:
            "استقبال في المطار والتوجه إلى الرياض. بعد الراحة، جولة مسائية في ساحة جامع الفنا وأسواقها التقليدية.",
          descriptionFr:
            "Accueil à l'aéroport et transfert au riad. Après un temps de repos, balade en soirée sur la place Jemaa el-Fna et ses souks traditionnels.",
          mealDinner: "عشاء حر في أسواق جامع الفنا",
          mealDinnerFr: "Dîner libre dans les souks de Jemaa el-Fna",
        },
        {
          title: "حدائق ماجوريل وقصر الباهية",
          titleFr: "Jardin Majorelle et Palais de la Bahia",
          description:
            "زيارة صباحية لحدائق ماجوريل الشهيرة، تليها جولة في قصر الباهية التاريخي. في المساء، جلسة استرخاء في حمام مغربي تقليدي.",
          descriptionFr:
            "Visite matinale du célèbre Jardin Majorelle, suivie d'une visite du Palais de la Bahia. En soirée, séance de détente dans un hammam marocain traditionnel.",
          mealBreakfast: "إفطار في الرياض",
          mealBreakfastFr: "Petit-déjeuner au riad",
        },
        {
          title: "رحلة إلى جبال الأطلس",
          titleFr: "Excursion dans les montagnes de l'Atlas",
          description:
            "يوم كامل في قرى جبال الأطلس، مع توقف عند شلالات أوريكا وتذوق أطباق محلية في قرية بربرية.",
          descriptionFr:
            "Journée complète dans les villages de l'Atlas, avec un arrêt aux cascades d'Ouirgane et dégustation de plats locaux dans un village berbère.",
          mealBreakfast: "إفطار في الرياض",
          mealBreakfastFr: "Petit-déjeuner au riad",
          mealLunch: "غداء تقليدي في قرية بربرية",
          mealLunchFr: "Déjeuner traditionnel dans un village berbère",
        },
        {
          title: "تسوق أخير والمغادرة",
          titleFr: "Derniers achats et départ",
          description: "وقت حر للتسوق في الأسواق التقليدية قبل التوجه إلى المطار للمغادرة.",
          descriptionFr: "Temps libre pour le shopping dans les souks avant le transfert à l'aéroport.",
          mealBreakfast: "إفطار في الرياض",
          mealBreakfastFr: "Petit-déjeuner au riad",
        },
      ],
    },
    {
      packageId: pkgParis.id,
      days: [
        {
          title: "الوصول ونزهة على السين",
          titleFr: "Arrivée et croisière sur la Seine",
          description: "استقبال في المطار والتوجه إلى الفندق. في المساء، جولة نهرية على متن قارب أمام برج إيفل المضيء.",
          descriptionFr:
            "Accueil à l'aéroport et transfert à l'hôtel. En soirée, croisière en bateau face à la tour Eiffel illuminée.",
          mealDinner: "عشاء فرنسي في مطعم مختار",
          mealDinnerFr: "Dîner français dans un restaurant sélectionné",
        },
        {
          title: "متحف اللوفر وشارع الشانزليزيه",
          titleFr: "Le Louvre et les Champs-Élysées",
          description: "زيارة خاصة لمتحف اللوفر برفقة مرشد متخصص، تليها نزهة على شارع الشانزليزيه وقوس النصر.",
          descriptionFr:
            "Visite privée du musée du Louvre avec un guide spécialisé, suivie d'une promenade sur les Champs-Élysées et à l'Arc de Triomphe.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
        {
          title: "يوم في قصر فرساي",
          titleFr: "Journée à Versailles",
          description: "رحلة يوم كامل إلى قصر فرساي وحدائقه الشاسعة، من أروع القصور الملكية في العالم.",
          descriptionFr:
            "Excursion d'une journée complète au château de Versailles et ses vastes jardins, l'un des plus somptueux palais royaux au monde.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
        {
          title: "مونمارتر وكاتدرائية نوتردام",
          titleFr: "Montmartre et Notre-Dame",
          description: "جولة في حي مونمارتر الفني وكنيسة ساكريه كور، ثم زيارة محيط كاتدرائية نوتردام التاريخية.",
          descriptionFr:
            "Visite du quartier artistique de Montmartre et de la basilique du Sacré-Cœur, puis visite des abords de la cathédrale Notre-Dame.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
        {
          title: "وقت حر والمغادرة",
          titleFr: "Temps libre et départ",
          description: "صباح حر للتسوق أو نزهة أخيرة قبل التوجه إلى المطار.",
          descriptionFr: "Matinée libre pour le shopping ou une dernière promenade avant le transfert à l'aéroport.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
      ],
    },
    {
      packageId: pkgDubai.id,
      days: [
        {
          title: "الوصول واستكشاف المارينا",
          titleFr: "Arrivée et découverte de la marina",
          description: "استقبال في المطار والتوجه إلى الفندق. في المساء، نزهة على واجهة مارينا دبي المائية.",
          descriptionFr:
            "Accueil à l'aéroport et transfert à l'hôtel. En soirée, promenade sur la corniche de Dubai Marina.",
          mealDinner: "عشاء في أحد مطاعم المارينا",
          mealDinnerFr: "Dîner dans un restaurant de la marina",
        },
        {
          title: "برج خليفة ونافورة دبي",
          titleFr: "Burj Khalifa et la fontaine de Dubaï",
          description: "صعود إلى قمة برج خليفة للاستمتاع بإطلالة بانورامية، ثم مشاهدة عروض نافورة دبي الراقصة.",
          descriptionFr:
            "Ascension au sommet du Burj Khalifa pour une vue panoramique, puis spectacle de la fontaine de Dubaï.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
        {
          title: "سفاري صحراوي",
          titleFr: "Safari dans le désert",
          description: "مغامرة عصرًا في الكثبان الرملية، غروب شمس ساحر، وعشاء بدوي أصيل مع عروض فلكلورية.",
          descriptionFr:
            "Aventure en fin d'après-midi dans les dunes, coucher de soleil féerique, et dîner bédouin authentique avec spectacles folkloriques.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
          mealDinner: "عشاء بدوي في المخيم الصحراوي",
          mealDinnerFr: "Dîner bédouin au camp du désert",
        },
        {
          title: "استرخاء وتسوق",
          titleFr: "Détente et shopping",
          description: "يوم حر للاستمتاع بمسبح الفندق أو التسوق في دبي مول وسوق الذهب التقليدي.",
          descriptionFr:
            "Journée libre pour profiter de la piscine de l'hôtel ou faire du shopping au Dubai Mall et au souk de l'or.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
        {
          title: "المغادرة",
          titleFr: "Départ",
          description: "وقت حر في الصباح قبل التوجه إلى المطار للمغادرة.",
          descriptionFr: "Matinée libre avant le transfert à l'aéroport pour le départ.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
      ],
    },
    {
      packageId: pkgIstanbul.id,
      days: [
        {
          title: "الوصول واستكشاف السلطان أحمد",
          titleFr: "Arrivée et découverte de Sultanahmet",
          description: "استقبال في المطار والتوجه إلى الفندق. في المساء، جولة أولى في حي السلطان أحمد التاريخي.",
          descriptionFr:
            "Accueil à l'aéroport et transfert à l'hôtel. En soirée, première découverte du quartier historique de Sultanahmet.",
          mealDinner: "عشاء تركي تقليدي",
          mealDinnerFr: "Dîner turc traditionnel",
        },
        {
          title: "آيا صوفيا والجامع الأزرق",
          titleFr: "Sainte-Sophie et la Mosquée bleue",
          description: "زيارة معمقة لآيا صوفيا التاريخية، ثم الجامع الأزرق الشهير بقبابه الزرقاء الساحرة.",
          descriptionFr:
            "Visite approfondie de Sainte-Sophie, puis de la célèbre Mosquée bleue et ses dômes bleus envoûtants.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
        {
          title: "الغراند بازار وجولة في البوسفور",
          titleFr: "Grand Bazar et croisière sur le Bosphore",
          description: "جولة تسوق في الغراند بازار التاريخي، تليها رحلة بحرية هادئة على مضيق البوسفور بين آسيا وأوروبا.",
          descriptionFr:
            "Shopping au Grand Bazar historique, suivi d'une paisible croisière sur le Bosphore entre l'Asie et l'Europe.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
        {
          title: "قصر توبكابي والمغادرة",
          titleFr: "Palais de Topkapi et départ",
          description: "زيارة صباحية لقصر توبكابي التاريخي، ثم وقت حر قبل التوجه إلى المطار.",
          descriptionFr: "Visite matinale du palais historique de Topkapi, puis temps libre avant le transfert à l'aéroport.",
          mealBreakfast: "إفطار في الفندق",
          mealBreakfastFr: "Petit-déjeuner à l'hôtel",
        },
      ],
    },
  ];

  for (const { packageId, days } of itineraries) {
    for (let i = 0; i < days.length; i++) {
      await prisma.itineraryDay.create({
        data: { tenantId, packageId, dayNumber: i + 1, ...days[i] },
      });
    }
  }

  console.log("Itineraries created.");
  console.log("Showcase content seeding complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
