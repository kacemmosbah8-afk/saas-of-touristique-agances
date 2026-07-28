import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TENANT_SLUG = "one-one-tourisme";

// --- Image pools sourced from Unsplash (free for commercial use, no
// attribution required under the Unsplash License). Grouped by theme so
// destinations/hotels/activities can each draw distinct, real photos. ---

const IMG = {
  jordan: [
    "/seed-images/jordan-petra-hero.jpg",
    "/seed-images/jordan-2.jpg",
    "/seed-images/jordan-3.jpg",
    "/seed-images/jordan-4.jpg",
    "/seed-images/jordan-5.jpg",
    "/seed-images/jordan-6.jpg",
    "/seed-images/jordan-7.jpg",
    "/seed-images/jordan-8.jpg",
    "/seed-images/jordan-9.jpg",
    "/seed-images/jordan-10.jpg",
  ],
  china: [
    "/seed-images/china-sheraton-huzhou-hero.jpg",
    "/seed-images/china-2.jpg",
    "/seed-images/china-3.jpg",
    "/seed-images/china-4.jpg",
    "/seed-images/china-5.jpg",
    "/seed-images/china-6.jpg",
    "/seed-images/china-7.jpg",
    "/seed-images/china-8.jpg",
    "/seed-images/china-9.jpg",
    "/seed-images/china-10.jpg",
  ],
  japan: [
    "/seed-images/japan-seiganto-ji-hero.jpg",
    "/seed-images/japan-2.jpg",
    "/seed-images/japan-3.jpg",
    "/seed-images/japan-4.jpg",
    "/seed-images/japan-5.jpg",
    "/seed-images/japan-6.jpg",
    "/seed-images/japan-7.jpg",
    "/seed-images/japan-8.jpg",
    "/seed-images/japan-9.jpg",
    "/seed-images/japan-10.jpg",
  ],
  london: [
    "/seed-images/london-bigben-hero.jpg",
    "/seed-images/london-2.jpg",
    "/seed-images/london-3.jpg",
    "/seed-images/london-4.jpg",
    "/seed-images/london-5.jpg",
    "/seed-images/london-6.jpg",
    "/seed-images/london-7.jpg",
    "/seed-images/london-8.jpg",
    "/seed-images/london-9.jpg",
    "/seed-images/london-10.jpg",
  ],
  maldives: [
    "/seed-images/maldives-underwater-restaurant-hero.jpg",
    "/seed-images/maldives-2.jpg",
    "/seed-images/maldives-3.jpg",
    "/seed-images/maldives-4.jpg",
    "/seed-images/maldives-5.jpg",
    "/seed-images/maldives-6.jpg",
    "/seed-images/maldives-7.jpg",
    "/seed-images/maldives-8.jpg",
    "/seed-images/maldives-9.jpg",
    "/seed-images/maldives-10.jpg",
  ],
  rome: [
    "/seed-images/rome-colosseum-hero.jpg",
    "/seed-images/rome-2.jpg",
    "/seed-images/rome-3.jpg",
    "/seed-images/rome-4.jpg",
    "/seed-images/rome-5.jpg",
    "/seed-images/rome-6.jpg",
    "/seed-images/rome-7.jpg",
    "/seed-images/rome-8.jpg",
    "/seed-images/rome-9.jpg",
    "/seed-images/rome-10.jpg",
  ],
  jordanHotel: [
    "/seed-images/jordanHotel-1.jpg",
    "/seed-images/jordanHotel-2.jpg",
    "/seed-images/jordanHotel-3.jpg",
    "/seed-images/jordanHotel-4.jpg",
    "/seed-images/jordanHotel-5.jpg",
    "/seed-images/jordanHotel-6.jpg",
    "/seed-images/jordanHotel-7.jpg",
    "/seed-images/jordanHotel-8.jpg",
  ],
  japanHotel: [
    "/seed-images/japanHotel-1.jpg",
    "/seed-images/japanHotel-2.jpg",
    "/seed-images/japanHotel-3.jpg",
    "/seed-images/japanHotel-4.jpg",
    "/seed-images/japanHotel-5.jpg",
    "/seed-images/japanHotel-6.jpg",
    "/seed-images/japanHotel-7.jpg",
    "/seed-images/japanHotel-8.jpg",
  ],
  londonHotel: [
    "/seed-images/londonHotel-1.jpg",
    "/seed-images/londonHotel-2.jpg",
    "/seed-images/londonHotel-3.jpg",
    "/seed-images/londonHotel-4.jpg",
    "/seed-images/londonHotel-5.jpg",
    "/seed-images/londonHotel-6.jpg",
    "/seed-images/londonHotel-7.jpg",
    "/seed-images/londonHotel-8.jpg",
  ],
  italyHotel: [
    "/seed-images/italyHotel-1.jpg",
    "/seed-images/italyHotel-2.jpg",
    "/seed-images/italyHotel-3.jpg",
    "/seed-images/italyHotel-4.jpg",
    "/seed-images/italyHotel-5.jpg",
    "/seed-images/italyHotel-6.jpg",
    "/seed-images/italyHotel-7.jpg",
    "/seed-images/italyHotel-8.jpg",
  ],
  istanbul: [
    "/seed-images/istanbul-1.jpg",
    "/seed-images/istanbul-2.jpg",
    "/seed-images/istanbul-3.jpg",
    "/seed-images/istanbul-4.jpg",
    "/seed-images/istanbul-5.jpg",
    "/seed-images/istanbul-6.jpg",
    "/seed-images/istanbul-7.jpg",
    "/seed-images/istanbul-8.jpg",
    "/seed-images/istanbul-9.jpg",
    "/seed-images/istanbul-10.jpg",
  ],
  dubai: [
    "/seed-images/dubai-burj-khalifa-sunset-hero.jpg",
    "/seed-images/dubai-2.jpg",
    "/seed-images/dubai-3.jpg",
    "/seed-images/dubai-4.jpg",
    "/seed-images/dubai-5.jpg",
    "/seed-images/dubai-6.jpg",
    "/seed-images/dubai-7.jpg",
    "/seed-images/dubai-8.jpg",
    "/seed-images/dubai-9.jpg",
    "/seed-images/dubai-10.jpg",
    "/seed-images/dubai-11.jpg",
  ],
  paris: [
    "/seed-images/paris-1.jpg",
    "/seed-images/paris-2.jpg",
    "/seed-images/paris-3.jpg",
    "/seed-images/paris-4.jpg",
    "/seed-images/paris-5.jpg",
    "/seed-images/paris-6.jpg",
    "/seed-images/paris-7.jpg",
    "/seed-images/paris-8.jpg",
    "/seed-images/paris-9.jpg",
    "/seed-images/paris-10.jpg",
    "/seed-images/paris-11.jpg",
    "/seed-images/paris-12.jpg",
  ],
  maldivesHotel: [
    "/seed-images/resort-pool-generic.jpg",
    "/seed-images/maldivesHotel-2.jpg",
    "/seed-images/maldivesHotel-3.jpg",
    "/seed-images/maldivesHotel-4.jpg",
    "/seed-images/villa-pool-night-generic.jpg",
    "/seed-images/maldivesHotel-6.jpg",
    "/seed-images/maldivesHotel-7.jpg",
    "/seed-images/maldivesHotel-8.jpg",
  ],
  istanbulHotel: [
    "/seed-images/istanbulHotel-1.jpg",
    "/seed-images/istanbulHotel-2.jpg",
    "/seed-images/istanbulHotel-3.jpg",
    "/seed-images/istanbulHotel-4.jpg",
    "/seed-images/istanbulHotel-5.jpg",
    "/seed-images/istanbulHotel-6.jpg",
    "/seed-images/istanbulHotel-7.jpg",
    "/seed-images/istanbulHotel-8.jpg",
  ],
  dubaiHotel: [
    "/seed-images/dubaiHotel-1.jpg",
    "/seed-images/dubaiHotel-2.jpg",
    "/seed-images/dubaiHotel-3.jpg",
    "/seed-images/dubaiHotel-4.jpg",
    "/seed-images/dubaiHotel-5.jpg",
    "/seed-images/dubaiHotel-6.jpg",
    "/seed-images/dubaiHotel-7.jpg",
    "/seed-images/dubaiHotel-8.jpg",
  ],
  parisHotel: [
    "/seed-images/parisHotel-1.jpg",
    "/seed-images/parisHotel-2.jpg",
    "/seed-images/parisHotel-3.jpg",
    "/seed-images/parisHotel-4.jpg",
    "/seed-images/parisHotel-5.jpg",
    "/seed-images/parisHotel-6.jpg",
    "/seed-images/parisHotel-7.jpg",
    "/seed-images/parisHotel-8.jpg",
  ],
};

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: TENANT_SLUG } });
  const tenantId = tenant.id;
  console.log(`Seeding catalog for tenant ${tenant.name} (${tenantId})`);

  // ---------------------------------------------------------------------
  // Outbound-only pivot — this agency sells no domestic Algeria programs.
  // Purge any Algeria catalog content from an earlier seed run. All FKs
  // cascade (see schema), so this is safe and idempotent (0 rows on rerun
  // once already purged).
  // ---------------------------------------------------------------------
  await prisma.package.deleteMany({
    where: {
      tenantId,
      slug: { in: ["algiers-weekend-discovery", "oran-coastal-getaway", "sahara-mzab-adventure"] },
    },
  });
  await prisma.hotel.deleteMany({
    where: {
      tenantId,
      slug: {
        in: [
          "hotel-el-djazair",
          "hilton-algiers",
          "le-meridien-oran",
          "hotel-royal-oran",
          "kasbah-ghardaia-lodge",
          "sahara-luxury-camp",
        ],
      },
    },
  });
  await prisma.activity.deleteMany({
    where: {
      tenantId,
      slug: {
        in: [
          "casbah-walking-tour",
          "notre-dame-corniche-tour",
          "santa-cruz-cable-car",
          "corniche-bike-tour",
          "mzab-valley-tour",
          "sahara-sunset-camel-trek",
        ],
      },
    },
  });
  await prisma.guide.deleteMany({ where: { tenantId, city: { in: ["الجزائر", "وهران", "غرداية"] } } });
  await prisma.transportProvider.deleteMany({
    where: { tenantId, city: { in: ["الجزائر", "وهران", "غرداية"] } },
  });
  await prisma.destination.deleteMany({
    where: { tenantId, slug: { in: ["algiers", "oran", "constantine", "ghardaia", "tlemcen"] } },
  });
  console.log("Purged Algeria catalog content (outbound-only pivot).");

  // ---------------------------------------------------------------------
  // Destinations
  // ---------------------------------------------------------------------
  const destinationDefs = [
    {
      slug: "jordan",
      name: "الأردن",
      nameFr: "Jordanie",
      country: "الأردن",
      countryFr: "Jordanie",
      city: "البتراء",
      cityFr: "Pétra",
      region: null,
      regionFr: null,
      featured: true,
      description:
        "أرض الأنباط الأسطورية، حيث تنحت مدينة البتراء الوردية في الصخر وسط أودية صحراوية ساحرة. تجمع الأردن بين آثار رومانية عريقة، والبحر الميت الأخفض نقطة على وجه الأرض، وصحراء وادي رم الحمراء.",
      descriptionFr:
        "La terre légendaire des Nabatéens, où la cité rose de Pétra est sculptée à même la roche au cœur de vallées désertiques envoûtantes. La Jordanie marie des ruines romaines millénaires, la mer Morte — le point le plus bas de la planète — et le désert rouge du Wadi Rum.",
      popularAttractions: ["البتراء", "وادي رم", "البحر الميت", "جرش الرومانية", "قلعة عجلون"],
      popularAttractionsFr: [
        "Pétra",
        "Wadi Rum",
        "La mer Morte",
        "Jerash romaine",
        "Château d'Ajloun",
      ],
      images: IMG.jordan,
    },
    {
      slug: "china",
      name: "الصين",
      nameFr: "Chine",
      country: "الصين",
      countryFr: "Chine",
      city: "شنغهاي",
      cityFr: "Shanghai",
      region: null,
      regionFr: null,
      featured: true,
      description:
        "امتزاج آسر بين التاريخ الإمبراطوري وناطحات السحاب المستقبلية. سور الصين العظيم يمتد عبر الجبال، بينما تتلألق شنغهاي بأضوائها الليلية على ضفاف نهر هوانغبو، في تجربة سفر تجمع بين الماضي والمستقبل.",
      descriptionFr:
        "Un mélange envoûtant entre l'histoire impériale et des gratte-ciels futuristes. La Grande Muraille serpente à travers les montagnes, tandis que Shanghai scintille de ses lumières nocturnes sur les rives du Huangpu — un voyage entre passé et avenir.",
      popularAttractions: ["سور الصين العظيم", "المدينة المحرمة", "برج شنغهاي", "جيش شيان الطيني", "الحي القديم"],
      popularAttractionsFr: [
        "La Grande Muraille",
        "La Cité interdite",
        "Tour de Shanghai",
        "Armée en terre cuite de Xi'an",
        "La vieille ville",
      ],
      images: IMG.china,
    },
    {
      slug: "japan",
      name: "اليابان",
      nameFr: "Japon",
      country: "اليابان",
      countryFr: "Japon",
      city: "كيوتو",
      cityFr: "Kyoto",
      region: null,
      regionFr: null,
      featured: true,
      description:
        "أرض المعابد الهادئة وأشجار الكرز المزهرة. كيوتو تحتضن مئات المعابد التقليدية وحدائق الزن، فيما تنتصب معابد مثل سيغانتوجي بجانب شلالات ناتشي المهيبة في مشهد طبيعي أخّاذ.",
      descriptionFr:
        "La terre des temples paisibles et des cerisiers en fleurs. Kyoto abrite des centaines de temples traditionnels et de jardins zen, tandis que des sanctuaires comme Seiganto-ji se dressent près des majestueuses chutes de Nachi, dans un paysage à couper le souffle.",
      popularAttractions: ["معبد سيغانتوجي وشلال ناتشي", "فوشيمي إيناري", "قصر كيوتو الإمبراطوري", "حي جيون", "جبل فوجي"],
      popularAttractionsFr: [
        "Seiganto-ji et les chutes de Nachi",
        "Fushimi Inari",
        "Palais impérial de Kyoto",
        "Quartier de Gion",
        "Mont Fuji",
      ],
      images: IMG.japan,
    },
    {
      slug: "london",
      name: "لندن",
      nameFr: "Londres",
      country: "المملكة المتحدة",
      countryFr: "Royaume-Uni",
      city: "لندن",
      cityFr: "Londres",
      region: null,
      regionFr: null,
      featured: true,
      description:
        "عاصمة تجمع بين التقاليد الملكية العريقة والحياة العصرية النابضة. برج بيغ بن وقصر البرلمان يطلان على نهر التايمز، بينما تعج شوارعها بالمتاحف العالمية والحافلات الحمراء الشهيرة.",
      descriptionFr:
        "Une capitale qui allie tradition royale séculaire et vie moderne trépidante. Big Ben et le palais de Westminster surplombent la Tamise, tandis que ses rues regorgent de musées de renommée mondiale et de ses célèbres bus rouges.",
      popularAttractions: ["بيغ بن والبرلمان", "عين لندن", "قصر باكنغهام", "جسر البرج", "المتحف البريطاني"],
      popularAttractionsFr: [
        "Big Ben et le Parlement",
        "London Eye",
        "Buckingham Palace",
        "Tower Bridge",
        "British Museum",
      ],
      images: IMG.london,
    },
    {
      slug: "maldives",
      name: "جزر المالديف",
      nameFr: "Maldives",
      country: "جزر المالديف",
      countryFr: "Maldives",
      city: "مالي",
      cityFr: "Malé",
      region: "المحيط الهندي",
      regionFr: "Océan Indien",
      featured: true,
      description:
        "جنة استوائية من الفلل المائية والشعاب المرجانية المتلألئة. مياه فيروزية صافية تحيط بمنتجعات فاخرة، حيث يمكن للنزلاء الغوص بين الأسماك الملونة أو تناول العشاء في مطعم تحت الماء.",
      descriptionFr:
        "Un paradis tropical de villas sur pilotis et de récifs coralliens scintillants. Des eaux turquoise cristallines entourent des complexes de luxe, où l'on peut plonger parmi les poissons colorés ou dîner dans un restaurant sous-marin.",
      popularAttractions: ["الفلل المائية", "الشعاب المرجانية", "الغطس والغوص", "مطاعم تحت الماء", "الشواطئ الرملية البيضاء"],
      popularAttractionsFr: [
        "Villas sur pilotis",
        "Récifs coralliens",
        "Snorkeling et plongée",
        "Restaurants sous-marins",
        "Plages de sable blanc",
      ],
      images: IMG.maldives,
    },
    {
      slug: "rome",
      name: "روما",
      nameFr: "Rome",
      country: "إيطاليا",
      countryFr: "Italie",
      city: "روما",
      cityFr: "Rome",
      region: null,
      regionFr: null,
      featured: true,
      description:
        "المدينة الخالدة، حيث يقف الكولوسيوم شامخًا كشاهد على عظمة الإمبراطورية الرومانية. أزقة روما العتيقة تقود إلى نافورة تريفي، والفاتيكان، وميادين تعج بالتاريخ والفن على مدى آلاف السنين.",
      descriptionFr:
        "La ville éternelle, où le Colisée se dresse en témoin de la grandeur de l'Empire romain. Les ruelles anciennes de Rome mènent à la fontaine de Trevi, au Vatican et à des places chargées d'histoire et d'art millénaires.",
      popularAttractions: ["الكولوسيوم", "نافورة تريفي", "الفاتيكان وكنيسة سيستين", "البانثيون", "الميدان الإسباني"],
      popularAttractionsFr: [
        "Le Colisée",
        "La fontaine de Trevi",
        "Le Vatican et la chapelle Sixtine",
        "Le Panthéon",
        "La place d'Espagne",
      ],
      images: IMG.rome,
    },
    {
      slug: "istanbul",
      name: "إسطنبول",
      nameFr: "Istanbul",
      country: "تركيا",
      countryFr: "Turquie",
      city: "إسطنبول",
      cityFr: "Istanbul",
      region: null,
      regionFr: null,
      featured: true,
      description:
        "المدينة التي تجمع بين قارتين، حيث يلتقي الشرق بالغرب على ضفاف مضيق البوسفور. تزخر بمعالم عثمانية وبيزنطية خالدة كآيا صوفيا وقصر توبكابي، إلى جانب أسواقها التاريخية النابضة بالحياة.",
      descriptionFr:
        "La ville qui enjambe deux continents, où l'Orient rencontre l'Occident sur les rives du Bosphore. Elle regorge de monuments ottomans et byzantins intemporels comme Sainte-Sophie et le palais de Topkapi, ainsi que de marchés historiques animés.",
      popularAttractions: ["آيا صوفيا", "قصر توبكابي", "السوق المسقوف", "مضيق البوسفور", "الجامع الأزرق"],
      popularAttractionsFr: [
        "Sainte-Sophie",
        "Palais de Topkapi",
        "Grand Bazar",
        "Détroit du Bosphore",
        "Mosquée Bleue",
      ],
      images: IMG.istanbul,
    },
    {
      slug: "dubai",
      name: "دبي",
      nameFr: "Dubaï",
      country: "الإمارات العربية المتحدة",
      countryFr: "Émirats Arabes Unis",
      city: "دبي",
      cityFr: "Dubaï",
      region: null,
      regionFr: null,
      featured: true,
      description:
        "مدينة الرفاهية والابتكار المعماري، موطن برج خليفة أعلى برج في العالم، ومراكز التسوق الفاخرة، ورحلات السفاري الصحراوية الآسرة. وجهة تجمع بين الحداثة المتلألئة والتراث البدوي الأصيل.",
      descriptionFr:
        "La ville du luxe et de l'innovation architecturale, abritant le Burj Khalifa, la plus haute tour du monde, des centres commerciaux somptueux et des safaris dans le désert envoûtants. Une destination qui allie modernité étincelante et héritage bédouin authentique.",
      popularAttractions: ["برج خليفة", "نافورة دبي", "برج العرب", "صحراء دبي", "سوق الذهب"],
      popularAttractionsFr: [
        "Burj Khalifa",
        "Fontaine de Dubaï",
        "Burj Al Arab",
        "Désert de Dubaï",
        "Souk de l'or",
      ],
      images: IMG.dubai,
    },
    {
      slug: "paris",
      name: "باريس",
      nameFr: "Paris",
      country: "فرنسا",
      countryFr: "France",
      city: "باريس",
      cityFr: "Paris",
      region: null,
      regionFr: null,
      featured: true,
      description:
        "مدينة النور والرومانسية، حيث يقف برج إيفل شامخًا فوق ضفاف نهر السين. تحتضن متحف اللوفر الأسطوري، وشارع الشانزليزيه، وأحياء مونمارتر الفنية، في تجربة أوروبية كلاسيكية لا تُنسى.",
      descriptionFr:
        "La ville lumière et de la romance, où la tour Eiffel se dresse fièrement sur les rives de la Seine. Elle abrite le mythique musée du Louvre, les Champs-Élysées et les quartiers artistiques de Montmartre, pour une expérience européenne classique inoubliable.",
      popularAttractions: ["برج إيفل", "متحف اللوفر", "الشانزليزيه", "مونمارتر", "كاتدرائية نوتردام"],
      popularAttractionsFr: [
        "Tour Eiffel",
        "Musée du Louvre",
        "Champs-Élysées",
        "Montmartre",
        "Cathédrale Notre-Dame",
      ],
      images: IMG.paris,
    },
  ];

  const destinations: Record<string, string> = {};

  for (const d of destinationDefs) {
    const dest = await prisma.destination.upsert({
      where: { tenantId_slug: { tenantId, slug: d.slug } },
      update: {},
      create: {
        tenantId,
        slug: d.slug,
        name: d.name,
        nameFr: d.nameFr,
        country: d.country,
        countryFr: d.countryFr,
        city: d.city,
        cityFr: d.cityFr,
        region: d.region,
        regionFr: d.regionFr,
        featured: d.featured,
        description: d.description,
        descriptionFr: d.descriptionFr,
        popularAttractions: d.popularAttractions,
        popularAttractionsFr: d.popularAttractionsFr,
        heroImageUrl: d.images[0],
        status: "ACTIVE",
        gallery: {
          create: d.images.map((url, i) => ({
            tenantId,
            url,
            position: i,
            alt: d.nameFr,
            altFr: d.nameFr,
          })),
        },
      },
    });
    destinations[d.slug] = dest.id;
    console.log(`Destination: ${d.nameFr} (${dest.id})`);
  }

  // ---------------------------------------------------------------------
  // Hotels
  // ---------------------------------------------------------------------
  const hotelDefs = [
    {
      slug: "amman-citadel-palace",
      citySlug: "jordan",
      name: "فندق قلعة عمّان",
      nameFr: "Amman Citadel Palace",
      category: "LUXURY" as const,
      stars: 5,
      city: "عمّان",
      cityFr: "Amman",
      country: "الأردن",
      countryFr: "Jordanie",
      description:
        "فندق فاخر يطل على تلال عمّان السبع، يجمع بين العمارة الأردنية التقليدية والرفاهية العصرية، وقاعدة مثالية لاستكشاف البتراء ووادي رم.",
      descriptionFr:
        "Un hôtel de luxe surplombant les sept collines d'Amman, alliant architecture jordanienne traditionnelle et confort moderne — une base idéale pour explorer Pétra et le Wadi Rum.",
      amenities: ["مسبح خارجي", "سبا", "واي فاي مجاني", "مطعم شرق أوسطي", "إطلالة بانورامية"],
      amenitiesFr: ["Piscine extérieure", "Spa", "Wi-Fi gratuit", "Restaurant moyen-oriental", "Vue panoramique"],
      images: IMG.jordanHotel.slice(0, 4),
    },
    {
      slug: "petra-view-resort",
      citySlug: "jordan",
      name: "منتجع إطلالة البتراء",
      nameFr: "Petra View Resort",
      category: "RESORT" as const,
      stars: 4,
      city: "البتراء",
      cityFr: "Pétra",
      country: "الأردن",
      countryFr: "Jordanie",
      description:
        "منتجع هادئ على أطراف مدينة البتراء الأثرية، بحدائق صحراوية وتراس يطل على الجبال الوردية، على بعد دقائق سيرًا من مدخل السيق.",
      descriptionFr:
        "Un complexe paisible aux portes de la cité antique de Pétra, avec des jardins désertiques et une terrasse donnant sur les montagnes roses, à quelques minutes à pied de l'entrée du Siq.",
      amenities: ["واي فاي مجاني", "مطعم تقليدي", "تراس بانورامي", "قرب البتراء"],
      amenitiesFr: ["Wi-Fi gratuit", "Restaurant traditionnel", "Terrasse panoramique", "Proche de Pétra"],
      images: IMG.jordanHotel.slice(4, 8),
    },
    {
      slug: "sheraton-huzhou-resort",
      citySlug: "china",
      name: "منتجع شيراتون هوتشو",
      nameFr: "Sheraton Huzhou Hot Spring Resort",
      category: "LUXURY" as const,
      stars: 5,
      city: "هوتشو",
      cityFr: "Huzhou",
      country: "الصين",
      countryFr: "Chine",
      description:
        "معلم معماري أيقوني على شكل حدوة حصان مضيئة، يطل على بحيرة تايهو، ويضم ينابيع مياه ساخنة طبيعية وأجنحة بانورامية فاخرة.",
      descriptionFr:
        "Un monument architectural emblématique en forme de fer à cheval illuminé, surplombant le lac Tai, doté de sources thermales naturelles et de suites panoramiques luxueuses.",
      amenities: ["ينابيع ساخنة", "مسبح داخلي", "واي فاي مجاني", "مطعم فاخر", "إطلالة على البحيرة"],
      amenitiesFr: ["Sources thermales", "Piscine intérieure", "Wi-Fi gratuit", "Restaurant gastronomique", "Vue sur le lac"],
      images: [
        "/seed-images/china-sheraton-huzhou-hero.jpg",
        "/seed-images/hotel-room-generic-blue-white.jpg",
        IMG.china[7],
        IMG.china[8],
      ],
    },
    {
      slug: "kyoto-zen-ryokan",
      citySlug: "japan",
      name: "نزل كيوتو زن التقليدي",
      nameFr: "Kyoto Zen Ryokan",
      category: "RIAD" as const,
      stars: 4,
      city: "كيوتو",
      cityFr: "Kyoto",
      country: "اليابان",
      countryFr: "Japon",
      description:
        "نزل ياباني تقليدي (ريوكان) بحصائر تاتامي وحمامات أونسن خاصة، يوفر تجربة ضيافة يابانية أصيلة وسط حدائق زن هادئة.",
      descriptionFr:
        "Un ryokan japonais traditionnel avec tatamis et bains onsen privés, offrant une expérience d'hospitalité japonaise authentique au cœur de jardins zen paisibles.",
      amenities: ["حمامات أونسن خاصة", "حصائر تاتامي", "واي فاي مجاني", "حديقة زن"],
      amenitiesFr: ["Bains onsen privés", "Tatamis", "Wi-Fi gratuit", "Jardin zen"],
      images: IMG.japanHotel.slice(0, 4),
    },
    {
      slug: "kyoto-imperial-hotel",
      citySlug: "japan",
      name: "فندق كيوتو الإمبراطوري",
      nameFr: "Kyoto Imperial Hotel",
      category: "LUXURY" as const,
      stars: 5,
      city: "كيوتو",
      cityFr: "Kyoto",
      country: "اليابان",
      countryFr: "Japon",
      description:
        "فندق فاخر عصري بالقرب من قصر كيوتو الإمبراطوري، يمزج بين التصميم الياباني الأنيق وخدمات فندقية عالمية المستوى.",
      descriptionFr:
        "Un hôtel de luxe moderne près du palais impérial de Kyoto, mariant design japonais raffiné et services hôteliers de classe internationale.",
      amenities: ["سبا", "مطعم ياباني فاخر", "واي فاي مجاني", "مركز لياقة"],
      amenitiesFr: ["Spa", "Restaurant japonais gastronomique", "Wi-Fi gratuit", "Salle de sport"],
      images: IMG.japanHotel.slice(4, 8),
    },
    {
      slug: "westminster-heritage-hotel",
      citySlug: "london",
      name: "فندق وستمنستر التراثي",
      nameFr: "Westminster Heritage Hotel",
      category: "LUXURY" as const,
      stars: 5,
      city: "لندن",
      cityFr: "Londres",
      country: "المملكة المتحدة",
      countryFr: "Royaume-Uni",
      description:
        "فندق كلاسيكي أنيق على بعد خطوات من بيغ بن ونهر التايمز، بديكور بريطاني تقليدي وخدمة استثنائية على الطراز الإنجليزي.",
      descriptionFr:
        "Un hôtel classique élégant à quelques pas de Big Ben et de la Tamise, au décor britannique traditionnel et au service exceptionnel à l'anglaise.",
      amenities: ["سبا", "مطعم بريطاني فاخر", "واي فاي مجاني", "بار كلاسيكي", "قرب المعالم"],
      amenitiesFr: ["Spa", "Restaurant britannique gastronomique", "Wi-Fi gratuit", "Bar classique", "Proche des sites"],
      images: IMG.londonHotel.slice(0, 4),
    },
    {
      slug: "thames-view-suites",
      citySlug: "london",
      name: "أجنحة إطلالة التايمز",
      nameFr: "Thames View Suites",
      category: "BOUTIQUE" as const,
      stars: 4,
      city: "لندن",
      cityFr: "Londres",
      country: "المملكة المتحدة",
      countryFr: "Royaume-Uni",
      description:
        "أجنحة بوتيك عصرية مطلة على نهر التايمز، بديكور أنيق ومطبخ إفطار بريطاني تقليدي، قريبة من جسر البرج والمتحف البريطاني.",
      descriptionFr:
        "Des suites-boutique modernes donnant sur la Tamise, au décor élégant et au petit-déjeuner britannique traditionnel, proches de Tower Bridge et du British Museum.",
      amenities: ["واي فاي مجاني", "إفطار بريطاني", "إطلالة على النهر", "خدمة كونسيرج"],
      amenitiesFr: ["Wi-Fi gratuit", "Petit-déjeuner britannique", "Vue sur la rivière", "Service de conciergerie"],
      images: IMG.londonHotel.slice(4, 8),
    },
    {
      slug: "underwater-wonder-resort",
      citySlug: "maldives",
      name: "منتجع العجائب تحت الماء",
      nameFr: "Underwater Wonder Resort",
      category: "RESORT" as const,
      stars: 5,
      city: "مالي",
      cityFr: "Malé",
      country: "جزر المالديف",
      countryFr: "Maldives",
      description:
        "منتجع فاخر يضم فللًا مائية ومطعمًا فريدًا تحت الماء محاطًا بالشعاب المرجانية والأسماك الاستوائية، لتجربة عشاء لا تُنسى.",
      descriptionFr:
        "Un complexe de luxe avec villas sur pilotis et un restaurant unique sous-marin entouré de récifs coralliens et de poissons tropicaux, pour une expérience culinaire inoubliable.",
      amenities: ["مطعم تحت الماء", "فلل مائية خاصة", "غطس وسط الشعاب", "واي فاي مجاني", "سبا فاخر"],
      amenitiesFr: ["Restaurant sous-marin", "Villas privées sur pilotis", "Plongée dans les récifs", "Wi-Fi gratuit", "Spa de luxe"],
      images: [
        "/seed-images/maldives-underwater-restaurant-hero.jpg",
        ...IMG.maldivesHotel.slice(0, 3),
      ],
    },
    {
      slug: "male-private-villa-retreat",
      citySlug: "maldives",
      name: "فلل مالي الخاصة الفاخرة",
      nameFr: "Malé Private Villa Retreat",
      category: "RESORT" as const,
      stars: 5,
      city: "مالي",
      cityFr: "Malé",
      country: "جزر المالديف",
      countryFr: "Maldives",
      description:
        "فلل خاصة فاخرة بمسابح لا متناهية وإطلالات مباشرة على المحيط الهندي، ملاذ هادئ بعيد عن الازدحام لعشاق الخصوصية والرفاهية.",
      descriptionFr:
        "Des villas privées luxueuses avec piscines à débordement et vue directe sur l'océan Indien — un havre paisible loin de la foule pour les amateurs d'intimité et de raffinement.",
      amenities: ["مسبح لا متناهي خاص", "شاطئ خاص", "خدمة كباتن الخدمة", "واي فاي مجاني"],
      amenitiesFr: ["Piscine à débordement privée", "Plage privée", "Service de majordome", "Wi-Fi gratuit"],
      images: IMG.maldivesHotel.slice(4, 8),
    },
    {
      slug: "colosseo-grand-hotel",
      citySlug: "rome",
      name: "فندق الكولوسيو الكبير",
      nameFr: "Colosseo Grand Hotel",
      category: "LUXURY" as const,
      stars: 5,
      city: "روما",
      cityFr: "Rome",
      country: "إيطاليا",
      countryFr: "Italie",
      description:
        "فندق فاخر على بعد خطوات من الكولوسيوم، بديكور إيطالي كلاسيكي وتراس يطل على أطلال روما القديمة، وخدمة إيطالية دافئة.",
      descriptionFr:
        "Un hôtel de luxe à quelques pas du Colisée, au décor classique italien et à la terrasse offrant une vue sur les ruines de la Rome antique, avec un service chaleureux à l'italienne.",
      amenities: ["سبا", "مطعم إيطالي فاخر", "واي فاي مجاني", "تراس بانورامي"],
      amenitiesFr: ["Spa", "Restaurant italien gastronomique", "Wi-Fi gratuit", "Terrasse panoramique"],
      images: IMG.italyHotel.slice(0, 4),
    },
    {
      slug: "trastevere-boutique-hotel",
      citySlug: "rome",
      name: "فندق تراستيفيري بوتيك",
      nameFr: "Trastevere Boutique Hotel",
      category: "BOUTIQUE" as const,
      stars: 4,
      city: "روما",
      cityFr: "Rome",
      country: "إيطاليا",
      countryFr: "Italie",
      description:
        "فندق بوتيك ساحر في حي تراستيفيري النابض بالحياة، بأزقته المرصوفة بالحجارة ومطاعمه التقليدية، أجواء رومانية أصيلة بعيدًا عن الزحام السياحي.",
      descriptionFr:
        "Un charmant hôtel-boutique dans le quartier animé du Trastevere, avec ses ruelles pavées et ses trattorias traditionnelles — une ambiance romaine authentique loin de la foule touristique.",
      amenities: ["واي فاي مجاني", "إفطار إيطالي", "تراس على السطح", "قرب الأزقة التاريخية"],
      amenitiesFr: ["Wi-Fi gratuit", "Petit-déjeuner italien", "Terrasse sur le toit", "Proche des ruelles historiques"],
      images: IMG.italyHotel.slice(4, 8),
    },
    {
      slug: "four-seasons-sultanahmet",
      citySlug: "istanbul",
      name: "فندق فور سيزونز السلطان أحمد",
      nameFr: "Four Seasons Sultanahmet",
      category: "LUXURY" as const,
      stars: 5,
      city: "إسطنبول",
      cityFr: "Istanbul",
      country: "تركيا",
      countryFr: "Turquie",
      description:
        "فندق فاخر في مبنى كان سجنًا عثمانيًا تاريخيًا، يقع على بعد خطوات من آيا صوفيا والجامع الأزرق، بحدائق داخلية هادئة وخدمة استثنائية.",
      descriptionFr:
        "Un hôtel de luxe installé dans un ancien bâtiment carcéral ottoman historique, à quelques pas de Sainte-Sophie et de la Mosquée Bleue, avec des jardins intérieurs paisibles et un service exceptionnel.",
      amenities: ["سبا عثماني", "مطعم فاخر", "واي فاي مجاني", "حديقة داخلية"],
      amenitiesFr: ["Spa ottoman", "Restaurant gastronomique", "Wi-Fi gratuit", "Jardin intérieur"],
      images: IMG.istanbulHotel.slice(0, 4),
    },
    {
      slug: "pera-palace-hotel",
      citySlug: "istanbul",
      name: "فندق بيرا بالاس",
      nameFr: "Pera Palace Hotel",
      category: "LUXURY" as const,
      stars: 5,
      city: "إسطنبول",
      cityFr: "Istanbul",
      country: "تركيا",
      countryFr: "Turquie",
      description:
        "فندق أسطوري بُني عام 1892 لضيوف قطار الشرق السريع، يحتفظ بأثاثه الكلاسيكي الأصلي وسط أجواء من الأناقة العثمانية الأوروبية.",
      descriptionFr:
        "Un hôtel légendaire construit en 1892 pour les passagers de l'Orient-Express, conservant son mobilier classique d'origine dans une atmosphère d'élégance ottomane-européenne.",
      amenities: ["مسبح داخلي", "سبا كلاسيكي", "واي فاي مجاني", "بار تاريخي"],
      amenitiesFr: ["Piscine intérieure", "Spa classique", "Wi-Fi gratuit", "Bar historique"],
      images: IMG.istanbulHotel.slice(4, 8),
    },
    {
      slug: "burj-al-arab",
      citySlug: "dubai",
      name: "برج العرب",
      nameFr: "Burj Al Arab",
      category: "LUXURY" as const,
      stars: 5,
      city: "دبي",
      cityFr: "Dubaï",
      country: "الإمارات العربية المتحدة",
      countryFr: "Émirats Arabes Unis",
      description:
        "رمز الفخامة العالمي على شكل شراع، يقدم أجنحة بانورامية بإطلالة على الخليج العربي، وخدمة كبير الخدم الشخصي على مدار الساعة.",
      descriptionFr:
        "Le symbole mondial du luxe en forme de voile, proposant des suites panoramiques avec vue sur le Golfe Persique et un service de majordome personnel 24h/24.",
      amenities: ["شاطئ خاص", "مسبح تحت الماء", "سبا فاخر", "خدمة كبير خدم شخصي", "هليكوبتر"],
      amenitiesFr: ["Plage privée", "Piscine sous-marine", "Spa de luxe", "Majordome personnel", "Héliport"],
      images: IMG.dubaiHotel.slice(0, 4),
    },
    {
      slug: "atlantis-the-palm",
      citySlug: "dubai",
      name: "أتلانتس النخلة",
      nameFr: "Atlantis The Palm",
      category: "RESORT" as const,
      stars: 5,
      city: "دبي",
      cityFr: "Dubaï",
      country: "الإمارات العربية المتحدة",
      countryFr: "Émirats Arabes Unis",
      description:
        "منتجع عائلي أسطوري على جزيرة النخلة، يضم حديقة مائية ضخمة، وحوض أحياء مائية عملاق، وشاطئًا خاصًا يمتد على طول الساحل.",
      descriptionFr:
        "Un complexe familial légendaire sur l'île de Palm Jumeirah, comprenant un immense parc aquatique, un aquarium géant et une plage privée s'étendant le long de la côte.",
      amenities: ["حديقة مائية", "حوض أسماك عملاق", "شاطئ خاص", "مطاعم عالمية"],
      amenitiesFr: ["Parc aquatique", "Aquarium géant", "Plage privée", "Restaurants internationaux"],
      images: IMG.dubaiHotel.slice(4, 8),
    },
    {
      slug: "hotel-le-meurice",
      citySlug: "paris",
      name: "فندق لو مورس",
      nameFr: "Hôtel Le Meurice",
      category: "LUXURY" as const,
      stars: 5,
      city: "باريس",
      cityFr: "Paris",
      country: "فرنسا",
      countryFr: "France",
      description:
        "قصر باريسي فاخر يطل على حديقة التويلري، بديكور مستوحى من قصر فرساي، وعلى مقربة من متحف اللوفر وشارع ريفولي الشهير.",
      descriptionFr:
        "Un palace parisien luxueux donnant sur le jardin des Tuileries, avec un décor inspiré du château de Versailles, à deux pas du Louvre et de la célèbre rue de Rivoli.",
      amenities: ["سبا فاخر", "مطعم حائز على نجمة ميشلان", "واي فاي مجاني", "خدمة كونسيرج"],
      amenitiesFr: ["Spa de luxe", "Restaurant étoilé Michelin", "Wi-Fi gratuit", "Service de conciergerie"],
      images: IMG.parisHotel.slice(0, 4),
    },
    {
      slug: "boutique-montmartre",
      citySlug: "paris",
      name: "فندق بوتيك مونمارتر",
      nameFr: "Boutique Montmartre",
      category: "BOUTIQUE" as const,
      stars: 4,
      city: "باريس",
      cityFr: "Paris",
      country: "فرنسا",
      countryFr: "France",
      description:
        "فندق بوتيك ساحر في قلب حي مونمارتر الفني، على بعد دقائق من بازيليك القلب المقدس، بديكور دافئ يعكس روح باريس القديمة.",
      descriptionFr:
        "Un charmant hôtel-boutique au cœur du quartier artistique de Montmartre, à quelques minutes de la basilique du Sacré-Cœur, avec une décoration chaleureuse reflétant l'âme du vieux Paris.",
      amenities: ["واي فاي مجاني", "إفطار فرنسي", "تراس على السطح", "قرب المعالم الفنية"],
      amenitiesFr: ["Wi-Fi gratuit", "Petit-déjeuner français", "Terrasse sur le toit", "Proche des sites artistiques"],
      images: IMG.parisHotel.slice(4, 8),
    },
  ];

  const hotels: Record<string, string> = {};

  for (const h of hotelDefs) {
    const hotel = await prisma.hotel.upsert({
      where: { tenantId_slug: { tenantId, slug: h.slug } },
      update: {},
      create: {
        tenantId,
        slug: h.slug,
        name: h.name,
        nameFr: h.nameFr,
        category: h.category,
        stars: h.stars,
        city: h.city,
        cityFr: h.cityFr,
        country: h.country,
        countryFr: h.countryFr,
        featured: true,
        description: h.description,
        descriptionFr: h.descriptionFr,
        amenities: h.amenities,
        amenitiesFr: h.amenitiesFr,
        coverImageUrl: h.images[0],
        status: "ACTIVE",
        images: {
          create: h.images.map((url, i) => ({
            tenantId,
            url,
            position: i,
            alt: h.nameFr,
            altFr: h.nameFr,
          })),
        },
      },
    });
    hotels[h.slug] = hotel.id;
    console.log(`Hotel: ${h.nameFr} (${hotel.id})`);
  }

  // ---------------------------------------------------------------------
  // Activities
  // ---------------------------------------------------------------------
  const activityDefs = [
    {
      slug: "petra-by-night-siq-walk",
      citySlug: "jordan",
      name: "البتراء ليلًا وجولة السيق",
      nameFr: "Petra by Night & Siq Walking Tour",
      category: "ثقافي",
      categoryFr: "Culturel",
      city: "البتراء",
      cityFr: "Pétra",
      country: "الأردن",
      countryFr: "Jordanie",
      durationMinutes: 180,
      meetingPoint: "مدخل السيق، البتراء",
      meetingPointFr: "Entrée du Siq, Pétra",
      description:
        "امشوا عبر ممر السيق الصخري المضاء بآلاف الشموع ليلًا، وصولًا إلى الخزنة الشهيرة، في تجربة ساحرة يرافقها العزف الموسيقي البدوي.",
      descriptionFr:
        "Marchez à travers le canyon du Siq illuminé de milliers de bougies la nuit, jusqu'au célèbre Trésor, dans une expérience envoûtante accompagnée de musique bédouine.",
      includedItems: ["مرشد محلي", "دخول موقع البتراء ليلًا", "شاي بدوي"],
      includedItemsFr: ["Guide local", "Entrée du site de Pétra de nuit", "Thé bédouin"],
      excludedItems: ["النقل من الفندق", "الوجبات"],
      excludedItemsFr: ["Transport depuis l'hôtel", "Repas"],
      sellingPrice: 40,
      currency: "USD",
      images: IMG.jordan.slice(0, 3),
    },
    {
      slug: "wadi-rum-jeep-bedouin-camp",
      citySlug: "jordan",
      name: "سفاري وادي رم وبيت الشعر البدوي",
      nameFr: "Wadi Rum Jeep Safari & Bedouin Camp",
      category: "مغامرة",
      categoryFr: "Aventure",
      city: "وادي رم",
      cityFr: "Wadi Rum",
      country: "الأردن",
      countryFr: "Jordanie",
      durationMinutes: 240,
      meetingPoint: "مركز زوار وادي رم",
      meetingPointFr: "Centre des visiteurs de Wadi Rum",
      description:
        "استكشفوا الصحراء الحمراء الأسطورية بسيارة دفع رباعي، وتوقفوا عند التشكيلات الصخرية القديمة، وأنهوا اليوم بعشاء بدوي تحت النجوم.",
      descriptionFr:
        "Explorez le désert rouge légendaire en 4x4, arrêtez-vous devant d'anciennes formations rocheuses, et terminez la journée par un dîner bédouin sous les étoiles.",
      includedItems: ["نقل بسيارة دفع رباعي", "عشاء بدوي", "مرشد صحراوي"],
      includedItemsFr: ["Transport en 4x4", "Dîner bédouin", "Guide du désert"],
      excludedItems: ["المشروبات", "الإقامة الليلية"],
      excludedItemsFr: ["Boissons", "Nuitée"],
      sellingPrice: 55,
      currency: "USD",
      images: IMG.jordan.slice(3, 6),
    },
    {
      slug: "shanghai-bund-evening-tour",
      citySlug: "china",
      name: "جولة مسائية في البند وأفق شنغهاي",
      nameFr: "Shanghai Bund & Skyline Evening Tour",
      category: "مشاهدة معالم",
      categoryFr: "Visite panoramique",
      city: "شنغهاي",
      cityFr: "Shanghai",
      country: "الصين",
      countryFr: "Chine",
      durationMinutes: 150,
      meetingPoint: "ساحة البند، شنغهاي",
      meetingPointFr: "Place du Bund, Shanghai",
      description:
        "نزهة مسائية على طول واجهة البند التاريخية، مع إطلالة ساحرة على أضواء ناطحات السحاب في حي بودونغ المقابل.",
      descriptionFr:
        "Une promenade en soirée le long de la célèbre promenade du Bund, avec une vue éblouissante sur les lumières des gratte-ciels du quartier de Pudong en face.",
      includedItems: ["مرشد سياحي", "جولة نهرية قصيرة"],
      includedItemsFr: ["Guide touristique", "Courte croisière fluviale"],
      excludedItems: ["الوجبات", "النقل من الفندق"],
      excludedItemsFr: ["Repas", "Transport depuis l'hôtel"],
      sellingPrice: 35,
      currency: "USD",
      images: IMG.china.slice(1, 4),
    },
    {
      slug: "great-wall-day-trip",
      citySlug: "china",
      name: "رحلة يومية إلى سور الصين العظيم",
      nameFr: "Great Wall Day Trip",
      category: "ثقافي",
      categoryFr: "Culturel",
      city: "بكين",
      cityFr: "Pékin",
      country: "الصين",
      countryFr: "Chine",
      durationMinutes: 480,
      meetingPoint: "استقبال من الفندق",
      meetingPointFr: "Prise en charge à l'hôtel",
      description:
        "رحلة يوم كامل إلى أحد أقسام سور الصين العظيم الأقل ازدحامًا، تشمل الصعود سيرًا على الأقدام والتقاط الصور من أبراج المراقبة التاريخية.",
      descriptionFr:
        "Une excursion d'une journée complète vers une section moins fréquentée de la Grande Muraille, incluant la marche et des photos depuis les tours de guet historiques.",
      includedItems: ["نقل ذهابًا وإيابًا", "مرشد سياحي", "وجبة غداء محلية"],
      includedItemsFr: ["Transport aller-retour", "Guide touristique", "Déjeuner local"],
      excludedItems: ["المشتريات الشخصية", "التأمين"],
      excludedItemsFr: ["Achats personnels", "Assurance"],
      sellingPrice: 60,
      currency: "USD",
      images: IMG.china.slice(4, 7),
    },
    {
      slug: "kyoto-temples-fushimi-inari-tour",
      citySlug: "japan",
      name: "معابد كيوتو وفوشيمي إيناري",
      nameFr: "Kyoto Temples & Fushimi Inari Tour",
      category: "ثقافي",
      categoryFr: "Culturel",
      city: "كيوتو",
      cityFr: "Kyoto",
      country: "اليابان",
      countryFr: "Japon",
      durationMinutes: 240,
      meetingPoint: "محطة كيوتو",
      meetingPointFr: "Gare de Kyoto",
      description:
        "زيارة لأشهر معابد كيوتو التقليدية، وصولًا إلى ممر البوابات الحمراء الآلاف في مزار فوشيمي إيناري الشهير.",
      descriptionFr:
        "Une visite des temples traditionnels les plus célèbres de Kyoto, jusqu'au tunnel des milliers de torii rouges du célèbre sanctuaire Fushimi Inari.",
      includedItems: ["مرشد سياحي", "دخول المعابد"],
      includedItemsFr: ["Guide touristique", "Entrée des temples"],
      excludedItems: ["الوجبات", "النقل"],
      excludedItemsFr: ["Repas", "Transport"],
      sellingPrice: 38,
      currency: "USD",
      images: IMG.japan.slice(1, 4),
    },
    {
      slug: "nachi-falls-seiganto-ji-pilgrimage",
      citySlug: "japan",
      name: "حج شلالات ناتشي ومعبد سيغانتوجي",
      nameFr: "Nachi Falls & Seiganto-ji Pilgrimage",
      category: "طبيعة",
      categoryFr: "Nature",
      city: "ناتشي كاتسورا",
      cityFr: "Nachikatsuura",
      country: "اليابان",
      countryFr: "Japon",
      durationMinutes: 210,
      meetingPoint: "مدخل معبد سيغانتوجي",
      meetingPointFr: "Entrée du temple Seiganto-ji",
      description:
        "مسار حج تقليدي عبر غابات كومانو المقدسة، يقود إلى معبد سيغانتوجي الحمر بجانب أعلى شلال في اليابان.",
      descriptionFr:
        "Un sentier de pèlerinage traditionnel à travers les forêts sacrées de Kumano, menant à la pagode rouge de Seiganto-ji, juste à côté de la plus haute cascade du Japon.",
      includedItems: ["مرشد محلي", "دخول المعبد"],
      includedItemsFr: ["Guide local", "Entrée du temple"],
      excludedItems: ["الوجبات", "النقل من الفندق"],
      excludedItemsFr: ["Repas", "Transport depuis l'hôtel"],
      sellingPrice: 42,
      currency: "USD",
      images: IMG.japan.slice(4, 7),
    },
    {
      slug: "westminster-big-ben-walking-tour",
      citySlug: "london",
      name: "جولة وستمنستر وبيغ بن سيرًا",
      nameFr: "Westminster & Big Ben Walking Tour",
      category: "مشاهدة معالم",
      categoryFr: "Visite panoramique",
      city: "لندن",
      cityFr: "Londres",
      country: "المملكة المتحدة",
      countryFr: "Royaume-Uni",
      durationMinutes: 150,
      meetingPoint: "ساحة البرلمان",
      meetingPointFr: "Parliament Square",
      description:
        "جولة سيرًا على الأقدام تمر ببيغ بن وقصر وستمنستر ودير وستمنستر، مع شرح تاريخي عن الملكية البريطانية وعراقة العاصمة.",
      descriptionFr:
        "Une visite à pied passant par Big Ben, le palais de Westminster et l'abbaye de Westminster, avec un récit historique sur la monarchie britannique et le passé de la capitale.",
      includedItems: ["مرشد سياحي", "سماعات صوتية"],
      includedItemsFr: ["Guide touristique", "Audioguides"],
      excludedItems: ["دخول الأبنية الداخلية", "الوجبات"],
      excludedItemsFr: ["Entrée des monuments", "Repas"],
      sellingPrice: 30,
      currency: "USD",
      images: IMG.london.slice(1, 4),
    },
    {
      slug: "thames-river-cruise",
      citySlug: "london",
      name: "جولة نهرية على التايمز",
      nameFr: "Thames River Cruise",
      category: "مشاهدة معالم",
      categoryFr: "Visite panoramique",
      city: "لندن",
      cityFr: "Londres",
      country: "المملكة المتحدة",
      countryFr: "Royaume-Uni",
      durationMinutes: 90,
      meetingPoint: "رصيف ويستمنستر",
      meetingPointFr: "Westminster Pier",
      description:
        "جولة بحرية هادئة على نهر التايمز، تمر بجسر البرج وعين لندن ومبنى البرلمان، مع شرح صوتي عن أبرز معالم العاصمة.",
      descriptionFr:
        "Une paisible croisière sur la Tamise, longeant Tower Bridge, le London Eye et le palais de Westminster, avec un commentaire audio sur les principaux sites de la capitale.",
      includedItems: ["تذكرة القارب", "شرح صوتي متعدد اللغات"],
      includedItemsFr: ["Billet de bateau", "Commentaire audio multilingue"],
      excludedItems: ["المرطبات", "النقل إلى نقطة الانطلاق"],
      excludedItemsFr: ["Rafraîchissements", "Transport vers le point de départ"],
      sellingPrice: 25,
      currency: "USD",
      images: IMG.london.slice(4, 7),
    },
    {
      slug: "snorkeling-coral-reef-excursion",
      citySlug: "maldives",
      name: "رحلة غطس بين الشعاب المرجانية",
      nameFr: "Snorkeling & Coral Reef Excursion",
      category: "مغامرة",
      categoryFr: "Aventure",
      city: "مالي",
      cityFr: "Malé",
      country: "جزر المالديف",
      countryFr: "Maldives",
      durationMinutes: 180,
      meetingPoint: "رصيف المنتجع",
      meetingPointFr: "Jetée du complexe",
      description:
        "رحلة بالقارب إلى أفضل مواقع الشعاب المرجانية، للغطس بين الأسماك الاستوائية الملونة والسلاحف البحرية في مياه صافية دافئة.",
      descriptionFr:
        "Une excursion en bateau vers les meilleurs sites de récifs coralliens, pour faire du snorkeling parmi des poissons tropicaux colorés et des tortues de mer dans des eaux chaudes et cristallines.",
      includedItems: ["معدات الغطس", "قارب خاص", "مرشد بحري"],
      includedItemsFr: ["Équipement de snorkeling", "Bateau privé", "Guide marin"],
      excludedItems: ["الوجبات", "التصوير تحت الماء"],
      excludedItemsFr: ["Repas", "Photographie sous-marine"],
      sellingPrice: 50,
      currency: "USD",
      images: IMG.maldives.slice(1, 4),
    },
    {
      slug: "sunset-dolphin-cruise",
      citySlug: "maldives",
      name: "جولة غروب مع الدلافين",
      nameFr: "Sunset Dolphin Cruise",
      category: "طبيعة",
      categoryFr: "Nature",
      city: "مالي",
      cityFr: "Malé",
      country: "جزر المالديف",
      countryFr: "Maldives",
      durationMinutes: 120,
      meetingPoint: "رصيف المنتجع",
      meetingPointFr: "Jetée du complexe",
      description:
        "جولة بحرية هادئة عند الغروب لمشاهدة قطعان الدلافين وهي تسبح بحرية في المياه الفيروزية، مع مشروبات ترحيبية على متن القارب.",
      descriptionFr:
        "Une paisible croisière au coucher du soleil pour observer des groupes de dauphins nager librement dans les eaux turquoise, avec des boissons de bienvenue à bord.",
      includedItems: ["تذكرة القارب", "مشروبات ترحيبية"],
      includedItemsFr: ["Billet de bateau", "Boissons de bienvenue"],
      excludedItems: ["الوجبات", "التصوير الاحترافي"],
      excludedItemsFr: ["Repas", "Photographie professionnelle"],
      sellingPrice: 45,
      currency: "USD",
      images: IMG.maldives.slice(4, 7),
    },
    {
      slug: "colosseum-roman-forum-private-tour",
      citySlug: "rome",
      name: "جولة خاصة في الكولوسيوم والمنتدى الروماني",
      nameFr: "Colosseum & Roman Forum Private Tour",
      category: "ثقافي",
      categoryFr: "Culturel",
      city: "روما",
      cityFr: "Rome",
      country: "إيطاليا",
      countryFr: "Italie",
      durationMinutes: 180,
      meetingPoint: "مدخل الكولوسيوم",
      meetingPointFr: "Entrée du Colisée",
      description:
        "جولة خاصة داخل الكولوسيوم والمنتدى الروماني برفقة مؤرخ متخصص، لاستكشاف أسرار الإمبراطورية الرومانية القديمة.",
      descriptionFr:
        "Une visite privée du Colisée et du Forum romain accompagnée d'un historien spécialisé, pour explorer les secrets de l'ancienne Rome impériale.",
      includedItems: ["تذكرة دخول ذات أولوية", "مؤرخ خاص", "سماعات صوتية"],
      includedItemsFr: ["Billet d'entrée coupe-file", "Historien privé", "Audioguides"],
      excludedItems: ["الوجبات", "النقل"],
      excludedItemsFr: ["Repas", "Transport"],
      sellingPrice: 65,
      currency: "USD",
      images: IMG.rome.slice(1, 4),
    },
    {
      slug: "vatican-museums-sistine-chapel",
      citySlug: "rome",
      name: "متاحف الفاتيكان وكنيسة سيستين",
      nameFr: "Vatican Museums & Sistine Chapel",
      category: "ثقافي",
      categoryFr: "Culturel",
      city: "الفاتيكان",
      cityFr: "Vatican",
      country: "إيطاليا",
      countryFr: "Italie",
      durationMinutes: 210,
      meetingPoint: "مدخل متاحف الفاتيكان",
      meetingPointFr: "Entrée des Musées du Vatican",
      description:
        "زيارة لأشهر متاحف الفن في العالم، تنتهي بلوحات مايكل أنجلو الخالدة على سقف كنيسة سيستين.",
      descriptionFr:
        "Une visite des musées d'art les plus célèbres au monde, se terminant par les fresques immortelles de Michel-Ange au plafond de la chapelle Sixtine.",
      includedItems: ["تذكرة دخول ذات أولوية", "مرشد متخصص"],
      includedItemsFr: ["Billet d'entrée coupe-file", "Guide spécialisé"],
      excludedItems: ["الوجبات", "النقل"],
      excludedItemsFr: ["Repas", "Transport"],
      sellingPrice: 58,
      currency: "USD",
      images: IMG.rome.slice(4, 7),
    },
    {
      slug: "bosphorus-sunset-cruise",
      citySlug: "istanbul",
      name: "جولة نهرية في البوسفور عند الغروب",
      nameFr: "Croisière au coucher du soleil sur le Bosphore",
      category: "مشاهدة معالم",
      categoryFr: "Visite panoramique",
      city: "إسطنبول",
      cityFr: "Istanbul",
      country: "تركيا",
      countryFr: "Turquie",
      durationMinutes: 120,
      meetingPoint: "ميناء أورتاكوي",
      meetingPointFr: "Port d'Ortaköy",
      description:
        "رحلة بحرية رومانسية عبر مضيق البوسفور، تمر بالقصور العثمانية والجسور الشهيرة، مع مشروبات ترحيبية على متن القارب.",
      descriptionFr:
        "Une croisière romantique à travers le détroit du Bosphore, longeant les palais ottomans et les ponts emblématiques, avec des boissons de bienvenue à bord.",
      includedItems: ["تذكرة القارب", "مشروبات ترحيبية", "مرشد سياحي"],
      includedItemsFr: ["Billet de bateau", "Boissons de bienvenue", "Guide touristique"],
      excludedItems: ["العشاء", "النقل من الفندق"],
      excludedItemsFr: ["Dîner", "Transport depuis l'hôtel"],
      sellingPrice: 38,
      currency: "USD",
      images: IMG.istanbul.slice(0, 3),
    },
    {
      slug: "hagia-sophia-topkapi-tour",
      citySlug: "istanbul",
      name: "آيا صوفيا وقصر توبكابي",
      nameFr: "Sainte-Sophie & Palais de Topkapi",
      category: "ثقافي",
      categoryFr: "Culturel",
      city: "إسطنبول",
      cityFr: "Istanbul",
      country: "تركيا",
      countryFr: "Turquie",
      durationMinutes: 240,
      meetingPoint: "ساحة السلطان أحمد",
      meetingPointFr: "Place Sultanahmet",
      description:
        "جولة تاريخية شاملة تجمع بين آيا صوفيا الأسطورية وقصر توبكابي الإمبراطوري، بمرافقة مرشد متخصص في التاريخ العثماني والبيزنطي.",
      descriptionFr:
        "Une visite historique complète associant la légendaire Sainte-Sophie et le palais impérial de Topkapi, accompagnée d'un guide spécialisé en histoire ottomane et byzantine.",
      includedItems: ["تذاكر الدخول", "مرشد متخصص", "سماعات صوتية"],
      includedItemsFr: ["Billets d'entrée", "Guide spécialisé", "Audioguides"],
      excludedItems: ["الوجبات", "النقل"],
      excludedItemsFr: ["Repas", "Transport"],
      sellingPrice: 42,
      currency: "USD",
      images: IMG.istanbul.slice(3, 6),
    },
    {
      slug: "desert-safari-bbq",
      citySlug: "dubai",
      name: "رحلة سفاري صحراوية وعشاء شواء",
      nameFr: "Safari dans le désert & dîner barbecue",
      category: "مغامرة",
      categoryFr: "Aventure",
      city: "دبي",
      cityFr: "Dubaï",
      country: "الإمارات العربية المتحدة",
      countryFr: "Émirats Arabes Unis",
      durationMinutes: 300,
      meetingPoint: "استقبال من الفندق",
      meetingPointFr: "Prise en charge à l'hôtel",
      description:
        "مغامرة تطعيس في الكثبان الرملية بسيارات الدفع الرباعي، تليها أمسية في مخيم بدوي مع عشاء شواء وعروض رقص التنورة والفلكلور.",
      descriptionFr:
        "Une aventure de dune bashing en 4x4, suivie d'une soirée dans un campement bédouin avec dîner barbecue et spectacles de danse folklorique.",
      includedItems: ["نقل بسيارة دفع رباعي", "عشاء شواء", "عروض فلكلورية", "ركوب الجمال"],
      includedItemsFr: ["Transport en 4x4", "Dîner barbecue", "Spectacles folkloriques", "Balade à dos de chameau"],
      excludedItems: ["المشروبات الكحولية", "التصوير الاحترافي"],
      excludedItemsFr: ["Boissons alcoolisées", "Photographie professionnelle"],
      sellingPrice: 65,
      currency: "USD",
      images: IMG.dubai.slice(0, 3),
    },
    {
      slug: "burj-khalifa-observation-deck",
      citySlug: "dubai",
      name: "برج خليفة - سطح المراقبة",
      nameFr: "Burj Khalifa - Plateforme d'observation",
      category: "مشاهدة معالم",
      categoryFr: "Visite panoramique",
      city: "دبي",
      cityFr: "Dubaï",
      country: "الإمارات العربية المتحدة",
      countryFr: "Émirats Arabes Unis",
      durationMinutes: 90,
      meetingPoint: "مدخل برج خليفة، دبي مول",
      meetingPointFr: "Entrée du Burj Khalifa, Dubai Mall",
      description:
        "استمتعوا بإطلالة بانورامية خلابة على مدينة دبي من الطابق 124 لأعلى برج في العالم، مع إمكانية مشاهدة نافورة دبي المائية.",
      descriptionFr:
        "Profitez d'une vue panoramique spectaculaire sur Dubaï depuis le 124e étage de la plus haute tour du monde, avec vue possible sur la fontaine de Dubaï.",
      includedItems: ["تذكرة الدخول ذات الأولوية", "مرشد صوتي"],
      includedItemsFr: ["Billet d'entrée coupe-file", "Audioguide"],
      excludedItems: ["النقل", "الوجبات"],
      excludedItemsFr: ["Transport", "Repas"],
      sellingPrice: 55,
      currency: "USD",
      images: IMG.dubai.slice(3, 6),
    },
    {
      slug: "seine-river-cruise",
      citySlug: "paris",
      name: "جولة نهرية على السين",
      nameFr: "Croisière sur la Seine",
      category: "مشاهدة معالم",
      categoryFr: "Visite panoramique",
      city: "باريس",
      cityFr: "Paris",
      country: "فرنسا",
      countryFr: "France",
      durationMinutes: 75,
      meetingPoint: "رصيف مونتيبيلو، بالقرب من نوتردام",
      meetingPointFr: "Quai de Montebello, près de Notre-Dame",
      description:
        "جولة بحرية هادئة على نهر السين، تمر بأبرز معالم باريس الكلاسيكية بما فيها برج إيفل، ومتحف أورسيه، وجزيرة السيتيه.",
      descriptionFr:
        "Une paisible croisière sur la Seine, longeant les plus beaux monuments classiques de Paris, dont la tour Eiffel, le musée d'Orsay et l'île de la Cité.",
      includedItems: ["تذكرة القارب", "شرح صوتي متعدد اللغات"],
      includedItemsFr: ["Billet de bateau", "Commentaire audio multilingue"],
      excludedItems: ["المرطبات", "النقل إلى نقطة الانطلاق"],
      excludedItemsFr: ["Rafraîchissements", "Transport vers le point de départ"],
      sellingPrice: 22,
      currency: "USD",
      images: IMG.paris.slice(0, 3),
    },
    {
      slug: "louvre-private-tour",
      citySlug: "paris",
      name: "متحف اللوفر مع مرشد خاص",
      nameFr: "Visite privée du Louvre",
      category: "ثقافي",
      categoryFr: "Culturel",
      city: "باريس",
      cityFr: "Paris",
      country: "فرنسا",
      countryFr: "France",
      durationMinutes: 180,
      meetingPoint: "الهرم الزجاجي، متحف اللوفر",
      meetingPointFr: "Pyramide du Louvre",
      description:
        "زيارة خاصة لأعظم متحف فني في العالم، تشمل لوحة الموناليزا وتمثال فينوس دو ميلو، برفقة مؤرخ فني متخصص.",
      descriptionFr:
        "Une visite privée du plus grand musée d'art au monde, incluant la Joconde et la Vénus de Milo, accompagnée d'un historien de l'art spécialisé.",
      includedItems: ["تذكرة دخول ذات أولوية", "مؤرخ فني خاص", "سماعات صوتية"],
      includedItemsFr: ["Billet d'entrée coupe-file", "Historien de l'art privé", "Audioguides"],
      excludedItems: ["الوجبات", "النقل"],
      excludedItemsFr: ["Repas", "Transport"],
      sellingPrice: 75,
      currency: "USD",
      images: IMG.paris.slice(3, 6),
    },
  ];

  const activities: Record<string, string> = {};

  for (const a of activityDefs) {
    const activity = await prisma.activity.upsert({
      where: { tenantId_slug: { tenantId, slug: a.slug } },
      update: {},
      create: {
        tenantId,
        slug: a.slug,
        name: a.name,
        nameFr: a.nameFr,
        category: a.category,
        categoryFr: a.categoryFr,
        city: a.city,
        cityFr: a.cityFr,
        country: a.country,
        countryFr: a.countryFr,
        durationMinutes: a.durationMinutes,
        meetingPoint: a.meetingPoint,
        meetingPointFr: a.meetingPointFr,
        featured: true,
        description: a.description,
        descriptionFr: a.descriptionFr,
        includedItems: a.includedItems,
        includedItemsFr: a.includedItemsFr,
        excludedItems: a.excludedItems,
        excludedItemsFr: a.excludedItemsFr,
        sellingPrice: a.sellingPrice,
        currency: a.currency,
        coverImageUrl: a.images[0],
        status: "ACTIVE",
        images: {
          create: a.images.map((url, i) => ({
            tenantId,
            fileKey: `seed-import-${a.slug}-${i}`,
            url,
            position: i,
            alt: a.nameFr,
            altFr: a.nameFr,
          })),
        },
      },
    });
    activities[a.slug] = activity.id;
    console.log(`Activity: ${a.nameFr} (${activity.id})`);
  }

  // ---------------------------------------------------------------------
  // Guides (no image field in schema)
  // ---------------------------------------------------------------------
  const guideDefs = [
    {
      citySlug: "jordan",
      name: "سامر الخطيب",
      languages: ["العربية", "الإنجليزية"],
      certifications: ["مرشد سياحي معتمد - وزارة السياحة الأردنية", "خبير البتراء ووادي رم"],
      experienceYears: 10,
      dailyRate: 65,
      city: "عمّان",
      country: "الأردن",
    },
    {
      citySlug: "china",
      name: "تشن لي",
      languages: ["الصينية", "الإنجليزية"],
      certifications: ["مرشد سياحي معتمد", "خبير شنغهاي وسور الصين"],
      experienceYears: 8,
      dailyRate: 70,
      city: "شنغهاي",
      country: "الصين",
    },
    {
      citySlug: "japan",
      name: "كينجي تاناكا",
      languages: ["اليابانية", "الإنجليزية"],
      certifications: ["مرشد سياحي رسمي معتمد"],
      experienceYears: 11,
      dailyRate: 75,
      city: "كيوتو",
      country: "اليابان",
    },
    {
      citySlug: "london",
      name: "جيمس هارتلي",
      languages: ["الإنجليزية", "الفرنسية"],
      certifications: ["مرشد سياحي أزرق معتمد - لندن"],
      experienceYears: 9,
      dailyRate: 70,
      city: "لندن",
      country: "المملكة المتحدة",
    },
    {
      citySlug: "maldives",
      name: "أحمد رشيد",
      languages: ["الديفيهية", "الإنجليزية", "العربية"],
      certifications: ["مرشد غوص معتمد", "خبير الشعاب المرجانية"],
      experienceYears: 7,
      dailyRate: 60,
      city: "مالي",
      country: "جزر المالديف",
    },
    {
      citySlug: "rome",
      name: "ماركو روسي",
      languages: ["الإيطالية", "الإنجليزية", "الفرنسية"],
      certifications: ["مرشد سياحي معتمد", "خبير التاريخ الروماني"],
      experienceYears: 13,
      dailyRate: 68,
      city: "روما",
      country: "إيطاليا",
    },
    {
      citySlug: "istanbul",
      name: "أليف يلدز",
      languages: ["التركية", "الإنجليزية", "العربية"],
      certifications: ["مرشدة سياحية رسمية - وزارة السياحة التركية"],
      experienceYears: 8,
      dailyRate: 65,
      city: "إسطنبول",
      country: "تركيا",
    },
    {
      citySlug: "dubai",
      name: "أحمد المري",
      languages: ["العربية", "الإنجليزية"],
      certifications: ["مرشد سياحي معتمد من هيئة دبي للسياحة"],
      experienceYears: 7,
      dailyRate: 80,
      city: "دبي",
      country: "الإمارات العربية المتحدة",
    },
  ];

  const guides: Record<string, string> = {};
  for (const g of guideDefs) {
    const existingGuide = await prisma.guide.findFirst({ where: { tenantId, name: g.name } });
    const guide =
      existingGuide ??
      (await prisma.guide.create({
        data: {
          tenantId,
          name: g.name,
          languages: g.languages,
          certifications: g.certifications,
          experienceYears: g.experienceYears,
          dailyRate: g.dailyRate,
          currency: "USD",
          city: g.city,
          country: g.country,
          status: "ACTIVE",
        },
      }));
    guides[g.citySlug] = guide.id;
    console.log(`Guide: ${g.name} (${guide.id})`);
  }

  // ---------------------------------------------------------------------
  // Transport providers (no image field in schema)
  // ---------------------------------------------------------------------
  const transportDefs = [
    {
      citySlug: "jordan",
      name: "عمّان VIP ترانسفير",
      type: "PRIVATE" as const,
      city: "عمّان",
      country: "الأردن",
      fleetNotes: "سيارات دفع رباعي وليموزين لرحلات عمّان-البتراء-وادي رم مع سائقين خبراء بالطرق الصحراوية.",
    },
    {
      citySlug: "china",
      name: "شنغهاي إليت ليموزين",
      type: "PRIVATE" as const,
      city: "شنغهاي",
      country: "الصين",
      fleetNotes: "أسطول ليموزين فاخر وسائقين ثنائيي اللغة لرحلات المدينة وسور الصين.",
    },
    {
      citySlug: "japan",
      name: "كيوتو ترانزيت الفاخر",
      type: "PRIVATE" as const,
      city: "كيوتو",
      country: "اليابان",
      fleetNotes: "سيارات خاصة نظيفة ودقيقة المواعيد لرحلات المعابد والمدن اليابانية.",
    },
    {
      citySlug: "london",
      name: "لندن رويال شوفير",
      type: "PRIVATE" as const,
      city: "لندن",
      country: "المملكة المتحدة",
      fleetNotes: "أسطول من سيارات الليموزين الكلاسيكية مع سائقين خاصين على مدار الساعة.",
    },
    {
      citySlug: "maldives",
      name: "مالديف سبيدبوت ترانسفرز",
      type: "BOAT" as const,
      city: "مالي",
      country: "جزر المالديف",
      fleetNotes: "قوارب سريعة وطائرات مائية لنقل النزلاء بين المطار والمنتجعات الجزرية.",
    },
    {
      citySlug: "rome",
      name: "روما دولتشي ترانسفير",
      type: "PRIVATE" as const,
      city: "روما",
      country: "إيطاليا",
      fleetNotes: "سيارات فاخرة إيطالية الطراز مع سائقين محترفين لرحلات المدينة والفاتيكان.",
    },
    {
      citySlug: "istanbul",
      name: "إسطنبول بوسفور ترانسفرز",
      type: "BOAT" as const,
      city: "إسطنبول",
      country: "تركيا",
      fleetNotes: "قوارب خاصة وزوارق سياحية لعبور مضيق البوسفور بين الجانبين الأوروبي والآسيوي.",
    },
    {
      citySlug: "dubai",
      name: "دبي إيليت شوفير",
      type: "PRIVATE" as const,
      city: "دبي",
      country: "الإمارات العربية المتحدة",
      fleetNotes: "أسطول فاخر من سيارات الليموزين مع سائقين خاصين على مدار الساعة.",
    },
  ];

  const transportProviders: Record<string, string> = {};
  for (const t of transportDefs) {
    const existingProvider = await prisma.transportProvider.findFirst({ where: { tenantId, name: t.name } });
    const provider =
      existingProvider ??
      (await prisma.transportProvider.create({
        data: {
          tenantId,
          name: t.name,
          type: t.type,
          city: t.city,
          country: t.country,
          fleetNotes: t.fleetNotes,
          status: "ACTIVE",
        },
      }));
    transportProviders[t.citySlug] = provider.id;
    console.log(`Transport: ${t.name} (${provider.id})`);
  }

  // ---------------------------------------------------------------------
  // Packages
  // ---------------------------------------------------------------------
  const packageDefs = [
    {
      slug: "petra-wadi-rum-explorer",
      citySlug: "jordan",
      name: "مستكشف البتراء ووادي رم",
      nameFr: "Petra & Wadi Rum Explorer",
      destination: "الأردن",
      destinationFr: "Jordanie",
      country: "الأردن",
      countryFr: "Jordanie",
      duration: 4,
      durationNights: 3,
      category: "مغامرة",
      categoryFr: "Aventure",
      difficulty: "MODERATE" as const,
      shortDescription: "مغامرة أردنية أصيلة بين مدينة البتراء الوردية ورمال وادي رم الحمراء.",
      shortDescriptionFr: "Une aventure jordanienne authentique entre la cité rose de Pétra et les sables rouges du Wadi Rum.",
      description:
        "رحلة استثنائية تجمع بين استكشاف مدينة البتراء الأثرية ليلًا ونهارًا، ومغامرة سفاري بسيارات الدفع الرباعي في صحراء وادي رم، مع إقامة فاخرة قرب الموقعين.",
      descriptionFr:
        "Un voyage exceptionnel combinant l'exploration de la cité antique de Pétra de jour comme de nuit, et une aventure safari en 4x4 dans le désert du Wadi Rum, avec un séjour de luxe à proximité des deux sites.",
      sellingPrice: 540,
      hotelSlug: "petra-view-resort",
      activitySlugs: ["petra-by-night-siq-walk", "wadi-rum-jeep-bedouin-camp"],
      images: IMG.jordan.slice(6, 10),
      highlights: ["البتراء ليلًا", "سفاري وادي رم", "عشاء بدوي تحت النجوم", "مرشد أردني خبير"],
      highlightsFr: ["Pétra de nuit", "Safari dans le Wadi Rum", "Dîner bédouin sous les étoiles", "Guide jordanien expert"],
      itinerary: [
        {
          dayNumber: 1,
          title: "الوصول إلى عمّان",
          titleFr: "Arrivée à Amman",
          description: "استقبال في المطار وتسجيل الدخول، مساء حر لاستكشاف وسط عمّان.",
          descriptionFr: "Accueil à l'aéroport et enregistrement, soirée libre pour explorer le centre d'Amman.",
        },
        {
          dayNumber: 2,
          title: "البتراء نهارًا وليلًا",
          titleFr: "Pétra de jour et de nuit",
          description: "يوم كامل لاستكشاف مدينة البتراء الأثرية، يليه جولة السيق المضاءة بالشموع مساءً.",
          descriptionFr: "Journée complète à explorer la cité antique de Pétra, suivie de la visite du Siq illuminé aux chandelles en soirée.",
        },
        {
          dayNumber: 3,
          title: "سفاري وادي رم",
          titleFr: "Safari dans le Wadi Rum",
          description: "انتقال إلى وادي رم لمغامرة سفاري بسيارة دفع رباعي، وعشاء بدوي تحت النجوم في مخيم صحراوي.",
          descriptionFr: "Transfert vers le Wadi Rum pour un safari en 4x4, puis dîner bédouin sous les étoiles dans un camp désertique.",
        },
        {
          dayNumber: 4,
          title: "المغادرة",
          titleFr: "Départ",
          description: "صباح هادئ في الصحراء، ثم العودة والتوجه إلى المطار.",
          descriptionFr: "Matinée paisible dans le désert, puis retour et transfert à l'aéroport.",
        },
      ],
    },
    {
      slug: "shanghai-great-wall-discovery",
      citySlug: "china",
      name: "اكتشاف شنغهاي وسور الصين العظيم",
      nameFr: "Shanghai & Great Wall Discovery",
      destination: "الصين",
      destinationFr: "Chine",
      country: "الصين",
      countryFr: "Chine",
      duration: 5,
      durationNights: 4,
      category: "مدينة",
      categoryFr: "Citadin",
      difficulty: "EASY" as const,
      shortDescription: "رحلة تجمع بين أضواء شنغهاي العصرية وعظمة سور الصين العظيم التاريخي.",
      shortDescriptionFr: "Un voyage alliant les lumières modernes de Shanghai à la grandeur historique de la Grande Muraille.",
      description:
        "برنامج شامل يجمع بين استكشاف أفق شنغهاي المذهل ليلًا، ورحلة يومية لا تُنسى إلى سور الصين العظيم، مع إقامة في منتجع شيراتون هوتشو الأيقوني.",
      descriptionFr:
        "Un programme complet alliant la découverte de l'incroyable skyline de Shanghai la nuit et une inoubliable excursion d'une journée à la Grande Muraille, avec un séjour à l'emblématique Sheraton Huzhou.",
      sellingPrice: 890,
      hotelSlug: "sheraton-huzhou-resort",
      activitySlugs: ["shanghai-bund-evening-tour", "great-wall-day-trip"],
      images: IMG.china.slice(1, 5),
      highlights: ["أفق شنغهاي ليلًا", "سور الصين العظيم", "منتجع شيراتون الأيقوني", "مرشد صيني محلي"],
      highlightsFr: ["Skyline de Shanghai la nuit", "La Grande Muraille", "Le Sheraton emblématique", "Guide local chinois"],
      itinerary: [
        {
          dayNumber: 1,
          title: "الوصول إلى شنغهاي",
          titleFr: "Arrivée à Shanghai",
          description: "استقبال وتسجيل الدخول، جولة مسائية في واجهة البند.",
          descriptionFr: "Accueil et enregistrement, promenade en soirée le long du Bund.",
        },
        {
          dayNumber: 2,
          title: "استكشاف شنغهاي",
          titleFr: "Découverte de Shanghai",
          description: "يوم حر لاستكشاف الحي القديم ومركز التسوق، ثم جولة أفق مسائية.",
          descriptionFr: "Journée libre pour explorer la vieille ville et le centre commercial, puis visite du skyline en soirée.",
        },
        {
          dayNumber: 3,
          title: "الانتقال إلى هوتشو",
          titleFr: "Transfert vers Huzhou",
          description: "انتقال إلى هوتشو وتسجيل الدخول في منتجع شيراتون الأيقوني على بحيرة تايهو.",
          descriptionFr: "Transfert vers Huzhou et enregistrement au Sheraton emblématique sur le lac Tai.",
        },
        {
          dayNumber: 4,
          title: "رحلة سور الصين العظيم",
          titleFr: "Excursion à la Grande Muraille",
          description: "رحلة يوم كامل إلى سور الصين العظيم مع مرشد متخصص.",
          descriptionFr: "Excursion d'une journée complète à la Grande Muraille avec un guide spécialisé.",
        },
        {
          dayNumber: 5,
          title: "المغادرة",
          titleFr: "Départ",
          description: "صباح حر، ثم التوجه إلى المطار.",
          descriptionFr: "Matinée libre, puis transfert à l'aéroport.",
        },
      ],
    },
    {
      slug: "kyoto-imperial-heritage",
      citySlug: "japan",
      name: "تراث كيوتو الإمبراطوري",
      nameFr: "Kyoto Imperial Heritage",
      destination: "اليابان",
      destinationFr: "Japon",
      country: "اليابان",
      countryFr: "Japon",
      duration: 5,
      durationNights: 4,
      category: "ثقافي",
      categoryFr: "Culturel",
      difficulty: "EASY" as const,
      shortDescription: "رحلة يابانية أصيلة بين معابد كيوتو الهادئة وشلالات ناتشي المهيبة.",
      shortDescriptionFr: "Un voyage japonais authentique entre les temples paisibles de Kyoto et les majestueuses chutes de Nachi.",
      description:
        "برنامج ثقافي غني يشمل زيارة معابد كيوتو التقليدية وبوابات فوشيمي إيناري الحمراء، ورحلة حج إلى شلالات ناتشي ومعبد سيغانتوجي، مع إقامة في نزل ياباني تقليدي.",
      descriptionFr:
        "Un programme culturel riche incluant la visite des temples traditionnels de Kyoto et des torii rouges de Fushimi Inari, ainsi qu'un pèlerinage aux chutes de Nachi et au temple Seiganto-ji, avec un séjour dans un ryokan traditionnel.",
      sellingPrice: 950,
      hotelSlug: "kyoto-zen-ryokan",
      activitySlugs: ["kyoto-temples-fushimi-inari-tour", "nachi-falls-seiganto-ji-pilgrimage"],
      images: IMG.japan.slice(1, 5),
      highlights: ["معابد كيوتو التقليدية", "بوابات فوشيمي إيناري", "شلالات ناتشي ومعبد سيغانتوجي", "نزل ريوكان أصيل"],
      highlightsFr: ["Temples traditionnels de Kyoto", "Torii de Fushimi Inari", "Chutes de Nachi et Seiganto-ji", "Ryokan authentique"],
      itinerary: [
        {
          dayNumber: 1,
          title: "الوصول إلى كيوتو",
          titleFr: "Arrivée à Kyoto",
          description: "استقبال وتسجيل الدخول في النزل الياباني التقليدي، مساء حر.",
          descriptionFr: "Accueil et enregistrement au ryokan traditionnel, soirée libre.",
        },
        {
          dayNumber: 2,
          title: "معابد كيوتو",
          titleFr: "Temples de Kyoto",
          description: "جولة في أشهر معابد كيوتو التقليدية وحدائقها الهادئة.",
          descriptionFr: "Visite des temples traditionnels les plus célèbres de Kyoto et de leurs jardins paisibles.",
        },
        {
          dayNumber: 3,
          title: "فوشيمي إيناري",
          titleFr: "Fushimi Inari",
          description: "زيارة ممر البوابات الحمراء الآلاف في مزار فوشيمي إيناري الشهير.",
          descriptionFr: "Visite du tunnel des milliers de torii rouges du célèbre sanctuaire Fushimi Inari.",
        },
        {
          dayNumber: 4,
          title: "شلالات ناتشي",
          titleFr: "Chutes de Nachi",
          description: "رحلة حج تقليدية إلى شلالات ناتشي ومعبد سيغانتوجي المهيب.",
          descriptionFr: "Pèlerinage traditionnel vers les chutes de Nachi et le majestueux temple Seiganto-ji.",
        },
        {
          dayNumber: 5,
          title: "المغادرة",
          titleFr: "Départ",
          description: "صباح حر، ثم التوجه إلى المطار.",
          descriptionFr: "Matinée libre, puis transfert à l'aéroport.",
        },
      ],
    },
    {
      slug: "london-classic-highlights",
      citySlug: "london",
      name: "أبرز معالم لندن الكلاسيكية",
      nameFr: "London Classic Highlights",
      destination: "لندن",
      destinationFr: "Londres",
      country: "المملكة المتحدة",
      countryFr: "Royaume-Uni",
      duration: 4,
      durationNights: 3,
      category: "مدينة",
      categoryFr: "Citadin",
      difficulty: "EASY" as const,
      shortDescription: "أبرز معالم العاصمة البريطانية بين بيغ بن ونهر التايمز والمتاحف العالمية.",
      shortDescriptionFr: "Les grands classiques de la capitale britannique entre Big Ben, la Tamise et les musées mondiaux.",
      description:
        "برنامج كلاسيكي لاكتشاف أبرز معالم لندن، يشمل جولة سيرًا حول بيغ بن ووستمنستر، وجولة نهرية على التايمز، مع إقامة فاخرة قرب قلب المدينة.",
      descriptionFr:
        "Un programme classique pour découvrir les principaux sites de Londres, incluant une visite à pied autour de Big Ben et Westminster, une croisière sur la Tamise, avec un séjour luxueux au cœur de la ville.",
      sellingPrice: 780,
      hotelSlug: "westminster-heritage-hotel",
      activitySlugs: ["westminster-big-ben-walking-tour", "thames-river-cruise"],
      images: IMG.london.slice(1, 5),
      highlights: ["بيغ بن ووستمنستر", "جولة نهرية على التايمز", "فندق تراثي فاخر", "المتحف البريطاني"],
      highlightsFr: ["Big Ben et Westminster", "Croisière sur la Tamise", "Hôtel patrimonial de luxe", "British Museum"],
      itinerary: [
        {
          dayNumber: 1,
          title: "الوصول إلى لندن",
          titleFr: "Arrivée à Londres",
          description: "استقبال وتسجيل الدخول، مساء حر لاستكشاف الحي المحيط بالفندق.",
          descriptionFr: "Accueil et enregistrement, soirée libre pour explorer le quartier autour de l'hôtel.",
        },
        {
          dayNumber: 2,
          title: "بيغ بن ووستمنستر",
          titleFr: "Big Ben et Westminster",
          description: "جولة سيرًا على الأقدام حول بيغ بن وقصر ودير وستمنستر.",
          descriptionFr: "Visite à pied autour de Big Ben, du palais et de l'abbaye de Westminster.",
        },
        {
          dayNumber: 3,
          title: "جولة نهرية والمتحف البريطاني",
          titleFr: "Croisière et British Museum",
          description: "جولة بحرية على نهر التايمز، تليها زيارة حرة للمتحف البريطاني.",
          descriptionFr: "Croisière sur la Tamise, suivie d'une visite libre du British Museum.",
        },
        {
          dayNumber: 4,
          title: "المغادرة",
          titleFr: "Départ",
          description: "صباح حر للتسوق، ثم التوجه إلى المطار.",
          descriptionFr: "Matinée libre pour le shopping, puis transfert à l'aéroport.",
        },
      ],
    },
    {
      slug: "maldives-overwater-escape",
      citySlug: "maldives",
      name: "عطلة المالديف فوق الماء",
      nameFr: "Maldives Overwater Escape",
      destination: "جزر المالديف",
      destinationFr: "Maldives",
      country: "جزر المالديف",
      countryFr: "Maldives",
      duration: 4,
      durationNights: 3,
      category: "شاطئي",
      categoryFr: "Balnéaire",
      difficulty: "EASY" as const,
      shortDescription: "عطلة استوائية فاخرة بين الفلل المائية والشعاب المرجانية المتلألئة.",
      shortDescriptionFr: "Une escapade tropicale luxueuse entre villas sur pilotis et récifs coralliens scintillants.",
      description:
        "تجربة استوائية استثنائية في فيلا مائية خاصة، تشمل رحلة غطس بين الشعاب المرجانية وجولة غروب لمشاهدة الدلافين، مع عشاء في مطعم فريد تحت الماء.",
      descriptionFr:
        "Une expérience tropicale exceptionnelle dans une villa privée sur pilotis, incluant une excursion de snorkeling dans les récifs coralliens et une croisière au coucher du soleil pour observer les dauphins, avec un dîner dans un restaurant sous-marin unique.",
      sellingPrice: 1250,
      hotelSlug: "underwater-wonder-resort",
      activitySlugs: ["snorkeling-coral-reef-excursion", "sunset-dolphin-cruise"],
      images: IMG.maldives.slice(1, 5),
      highlights: ["فيلا مائية خاصة", "مطعم تحت الماء", "غطس بين الشعاب المرجانية", "جولة غروب مع الدلافين"],
      highlightsFr: ["Villa privée sur pilotis", "Restaurant sous-marin", "Snorkeling dans les récifs", "Croisière au coucher du soleil"],
      itinerary: [
        {
          dayNumber: 1,
          title: "الوصول إلى مالي",
          titleFr: "Arrivée à Malé",
          description: "استقبال بقارب سريع إلى المنتجع وتسجيل الدخول إلى الفيلا المائية.",
          descriptionFr: "Accueil en speedboat vers le complexe et enregistrement dans la villa sur pilotis.",
        },
        {
          dayNumber: 2,
          title: "غطس بين الشعاب",
          titleFr: "Snorkeling dans les récifs",
          description: "رحلة بالقارب لاستكشاف أفضل مواقع الشعاب المرجانية والحياة البحرية.",
          descriptionFr: "Excursion en bateau pour explorer les meilleurs sites de récifs coralliens et la vie marine.",
        },
        {
          dayNumber: 3,
          title: "جولة الدلافين والعشاء تحت الماء",
          titleFr: "Croisière dauphins et dîner sous-marin",
          description: "جولة غروب لمشاهدة الدلافين، تليها عشاء لا يُنسى في المطعم تحت الماء.",
          descriptionFr: "Croisière au coucher du soleil pour observer les dauphins, suivie d'un dîner inoubliable au restaurant sous-marin.",
        },
        {
          dayNumber: 4,
          title: "المغادرة",
          titleFr: "Départ",
          description: "صباح حر على الشاطئ، ثم التوجه بالقارب إلى المطار.",
          descriptionFr: "Matinée libre à la plage, puis transfert en bateau vers l'aéroport.",
        },
      ],
    },
    {
      slug: "rome-imperial-discovery",
      citySlug: "rome",
      name: "اكتشاف روما الإمبراطورية",
      nameFr: "Rome Imperial Discovery",
      destination: "روما",
      destinationFr: "Rome",
      country: "إيطاليا",
      countryFr: "Italie",
      duration: 4,
      durationNights: 3,
      category: "ثقافي",
      categoryFr: "Culturel",
      difficulty: "EASY" as const,
      shortDescription: "رحلة كلاسيكية إلى المدينة الخالدة بين الكولوسيوم والفاتيكان.",
      shortDescriptionFr: "Un voyage classique vers la ville éternelle entre le Colisée et le Vatican.",
      description:
        "برنامج ثقافي شامل يجمع بين جولة خاصة في الكولوسيوم والمنتدى الروماني، وزيارة متاحف الفاتيكان وكنيسة سيستين، مع إقامة فاخرة قرب المعالم التاريخية.",
      descriptionFr:
        "Un programme culturel complet alliant une visite privée du Colisée et du Forum romain, et la découverte des Musées du Vatican et de la chapelle Sixtine, avec un séjour de luxe près des sites historiques.",
      sellingPrice: 820,
      hotelSlug: "colosseo-grand-hotel",
      activitySlugs: ["colosseum-roman-forum-private-tour", "vatican-museums-sistine-chapel"],
      images: IMG.rome.slice(1, 5),
      highlights: ["الكولوسيوم والمنتدى الروماني", "متاحف الفاتيكان وكنيسة سيستين", "فندق فاخر قرب المعالم", "مرشد إيطالي خبير"],
      highlightsFr: ["Colisée et Forum romain", "Musées du Vatican et chapelle Sixtine", "Hôtel de luxe près des sites", "Guide italien expert"],
      itinerary: [
        {
          dayNumber: 1,
          title: "الوصول إلى روما",
          titleFr: "Arrivée à Rome",
          description: "استقبال وتسجيل الدخول، مساء حر لاستكشاف حي تراستيفيري.",
          descriptionFr: "Accueil et enregistrement, soirée libre pour explorer le quartier du Trastevere.",
        },
        {
          dayNumber: 2,
          title: "الكولوسيوم والمنتدى الروماني",
          titleFr: "Colisée et Forum romain",
          description: "جولة خاصة في الكولوسيوم والمنتدى الروماني برفقة مؤرخ متخصص.",
          descriptionFr: "Visite privée du Colisée et du Forum romain accompagnée d'un historien spécialisé.",
        },
        {
          dayNumber: 3,
          title: "الفاتيكان وكنيسة سيستين",
          titleFr: "Vatican et chapelle Sixtine",
          description: "زيارة متاحف الفاتيكان الشهيرة وسقف كنيسة سيستين الخالد.",
          descriptionFr: "Visite des célèbres Musées du Vatican et du plafond immortel de la chapelle Sixtine.",
        },
        {
          dayNumber: 4,
          title: "المغادرة",
          titleFr: "Départ",
          description: "صباح حر للتسوق، ثم التوجه إلى المطار.",
          descriptionFr: "Matinée libre pour le shopping, puis transfert à l'aéroport.",
        },
      ],
    },
    {
      slug: "istanbul-imperial-highlights",
      citySlug: "istanbul",
      name: "أبرز معالم إسطنبول الإمبراطورية",
      nameFr: "Les incontournables d'Istanbul impériale",
      destination: "إسطنبول",
      destinationFr: "Istanbul",
      country: "تركيا",
      countryFr: "Turquie",
      duration: 5,
      durationNights: 4,
      category: "ثقافي",
      categoryFr: "Culturel",
      difficulty: "EASY" as const,
      shortDescription: "رحلة عبر قارتين لاكتشاف كنوز إسطنبول العثمانية والبيزنطية.",
      shortDescriptionFr: "Un voyage à travers deux continents pour découvrir les trésors ottomans et byzantins d'Istanbul.",
      description:
        "برنامج ثقافي غني يشمل زيارة آيا صوفيا وقصر توبكابي، وجولة نهرية ساحرة في مضيق البوسفور عند الغروب، مع إقامة في فندق تاريخي فاخر.",
      descriptionFr:
        "Un programme culturel riche incluant la visite de Sainte-Sophie et du palais de Topkapi, une croisière envoûtante sur le Bosphore au coucher du soleil, avec un séjour dans un hôtel historique de luxe.",
      sellingPrice: 650,
      hotelSlug: "four-seasons-sultanahmet",
      activitySlugs: ["hagia-sophia-topkapi-tour", "bosphorus-sunset-cruise"],
      images: IMG.istanbul.slice(6, 10),
      highlights: ["آيا صوفيا وقصر توبكابي", "جولة نهرية في البوسفور", "فندق تاريخي فاخر", "السوق المسقوف"],
      highlightsFr: ["Sainte-Sophie & palais de Topkapi", "Croisière sur le Bosphore", "Hôtel historique de luxe", "Grand Bazar"],
      itinerary: [
        {
          dayNumber: 1,
          title: "الوصول إلى إسطنبول",
          titleFr: "Arrivée à Istanbul",
          description: "استقبال وتسجيل الدخول، مساء حر لاستكشاف حي السلطان أحمد.",
          descriptionFr: "Accueil et enregistrement, soirée libre pour explorer le quartier de Sultanahmet.",
        },
        {
          dayNumber: 2,
          title: "آيا صوفيا وقصر توبكابي",
          titleFr: "Sainte-Sophie & Palais de Topkapi",
          description: "جولة تاريخية شاملة في أهم المعالم العثمانية والبيزنطية.",
          descriptionFr: "Visite historique complète des principaux monuments ottomans et byzantins.",
        },
        {
          dayNumber: 3,
          title: "السوق المسقوف والتسوق",
          titleFr: "Grand Bazar et shopping",
          description: "يوم حر للتسوق في السوق المسقوف التاريخي والأسواق المحيطة.",
          descriptionFr: "Journée libre pour le shopping au Grand Bazar historique et ses environs.",
        },
        {
          dayNumber: 4,
          title: "جولة البوسفور",
          titleFr: "Croisière sur le Bosphore",
          description: "جولة نهرية رومانسية عند الغروب عبر مضيق البوسفور.",
          descriptionFr: "Croisière romantique au coucher du soleil à travers le détroit du Bosphore.",
        },
        {
          dayNumber: 5,
          title: "المغادرة",
          titleFr: "Départ",
          description: "وقت حر صباحًا، ثم التوجه إلى المطار.",
          descriptionFr: "Matinée libre, puis transfert à l'aéroport.",
        },
      ],
    },
    {
      slug: "dubai-luxury-escape",
      citySlug: "dubai",
      name: "عطلة دبي الفاخرة",
      nameFr: "Escapade de luxe à Dubaï",
      destination: "دبي",
      destinationFr: "Dubaï",
      country: "الإمارات العربية المتحدة",
      countryFr: "Émirats Arabes Unis",
      duration: 4,
      durationNights: 3,
      category: "فاخر",
      categoryFr: "Luxe",
      difficulty: "EASY" as const,
      shortDescription: "رفاهية استثنائية بين ناطحات السحاب ورمال الصحراء الذهبية.",
      shortDescriptionFr: "Un luxe exceptionnel entre gratte-ciels et sables dorés du désert.",
      description:
        "تجربة فاخرة تجمع بين برج خليفة وسحر مدينة المستقبل، ومغامرة سفاري صحراوية مثيرة، مع إقامة في أحد أرقى منتجعات العالم.",
      descriptionFr:
        "Une expérience luxueuse combinant le Burj Khalifa et la magie de la ville du futur, avec une aventure de safari dans le désert, dans l'un des complexes les plus raffinés au monde.",
      sellingPrice: 890,
      hotelSlug: "burj-al-arab",
      activitySlugs: ["burj-khalifa-observation-deck", "desert-safari-bbq"],
      images: IMG.dubai.slice(6, 10),
      highlights: ["برج خليفة", "سفاري صحراوي وعشاء شواء", "إقامة في برج العرب", "نافورة دبي"],
      highlightsFr: ["Burj Khalifa", "Safari désert & dîner barbecue", "Séjour au Burj Al Arab", "Fontaine de Dubaï"],
      itinerary: [
        {
          dayNumber: 1,
          title: "الوصول إلى دبي",
          titleFr: "Arrivée à Dubaï",
          description: "استقبال فاخر وتسجيل الدخول، مساء حر لمشاهدة نافورة دبي.",
          descriptionFr: "Accueil de luxe et enregistrement, soirée libre pour admirer la fontaine de Dubaï.",
        },
        {
          dayNumber: 2,
          title: "برج خليفة",
          titleFr: "Burj Khalifa",
          description: "زيارة سطح المراقبة في أعلى برج بالعالم، ووقت حر للتسوق في دبي مول.",
          descriptionFr: "Visite de la plateforme d'observation de la plus haute tour du monde, temps libre au Dubai Mall.",
        },
        {
          dayNumber: 3,
          title: "سفاري صحراوي",
          titleFr: "Safari dans le désert",
          description: "مغامرة تطعيس في الكثبان، تليها أمسية بدوية مع عشاء شواء وعروض فلكلورية.",
          descriptionFr: "Aventure de dune bashing, suivie d'une soirée bédouine avec dîner barbecue et spectacles folkloriques.",
        },
        {
          dayNumber: 4,
          title: "المغادرة",
          titleFr: "Départ",
          description: "صباح حر في المنتجع، ثم التوجه إلى المطار.",
          descriptionFr: "Matinée libre au complexe, puis transfert à l'aéroport.",
        },
      ],
    },
    {
      slug: "paris-classic-highlights",
      citySlug: "paris",
      name: "أبرز معالم باريس الكلاسيكية",
      nameFr: "Les incontournables de Paris",
      destination: "باريس",
      destinationFr: "Paris",
      country: "فرنسا",
      countryFr: "France",
      duration: 4,
      durationNights: 3,
      category: "مدينة",
      categoryFr: "Citadin",
      difficulty: "EASY" as const,
      shortDescription: "أبرز معالم مدينة النور بين برج إيفل ونهر السين ومتحف اللوفر.",
      shortDescriptionFr: "Les grands classiques de la ville lumière entre la tour Eiffel, la Seine et le Louvre.",
      description:
        "رحلة كلاسيكية إلى مدينة النور، تشمل جولة نهرية على السين، وزيارة خاصة لمتحف اللوفر، وإقامة فاخرة على مقربة من حديقة التويلري.",
      descriptionFr:
        "Un voyage classique dans la ville lumière, incluant une croisière sur la Seine, une visite privée du Louvre et un séjour luxueux près du jardin des Tuileries.",
      sellingPrice: 720,
      hotelSlug: "hotel-le-meurice",
      activitySlugs: ["seine-river-cruise", "louvre-private-tour"],
      images: IMG.paris.slice(6, 10),
      highlights: ["جولة نهرية على السين", "زيارة خاصة للوفر", "فندق فاخر قرب التويلري", "برج إيفل"],
      highlightsFr: ["Croisière sur la Seine", "Visite privée du Louvre", "Hôtel de luxe près des Tuileries", "Tour Eiffel"],
      itinerary: [
        {
          dayNumber: 1,
          title: "الوصول إلى باريس",
          titleFr: "Arrivée à Paris",
          description: "استقبال وتسجيل الدخول، مساء حر للتنزه قرب برج إيفل.",
          descriptionFr: "Accueil et enregistrement, soirée libre pour se promener près de la tour Eiffel.",
        },
        {
          dayNumber: 2,
          title: "متحف اللوفر",
          titleFr: "Musée du Louvre",
          description: "زيارة خاصة لمتحف اللوفر برفقة مؤرخ فني متخصص.",
          descriptionFr: "Visite privée du musée du Louvre accompagnée d'un historien de l'art spécialisé.",
        },
        {
          dayNumber: 3,
          title: "جولة نهرية ومونمارتر",
          titleFr: "Croisière et Montmartre",
          description: "جولة بحرية على نهر السين، تليها نزهة مسائية في حي مونمارتر الفني.",
          descriptionFr: "Croisière sur la Seine, suivie d'une promenade en soirée dans le quartier artistique de Montmartre.",
        },
        {
          dayNumber: 4,
          title: "المغادرة",
          titleFr: "Départ",
          description: "صباح حر للتسوق، ثم التوجه إلى المطار.",
          descriptionFr: "Matinée libre pour le shopping, puis transfert à l'aéroport.",
        },
      ],
    },
  ];

  for (const p of packageDefs) {
    const pkg = await prisma.package.upsert({
      where: { tenantId_slug: { tenantId, slug: p.slug } },
      update: {},
      create: {
        tenantId,
        slug: p.slug,
        name: p.name,
        nameFr: p.nameFr,
        destination: p.destination,
        destinationFr: p.destinationFr,
        country: p.country,
        countryFr: p.countryFr,
        duration: p.duration,
        durationNights: p.durationNights,
        category: p.category,
        categoryFr: p.categoryFr,
        difficulty: p.difficulty,
        featured: true,
        shortDescription: p.shortDescription,
        shortDescriptionFr: p.shortDescriptionFr,
        description: p.description,
        descriptionFr: p.descriptionFr,
        sellingPrice: p.sellingPrice,
        currency: "USD",
        coverImageUrl: p.images[0],
        highlights: p.highlights,
        highlightsFr: p.highlightsFr,
        includedServices: ["إقامة فندقية", "أنشطة مذكورة في البرنامج", "استقبال المطار"],
        includedServicesFr: ["Hébergement hôtelier", "Activités mentionnées au programme", "Accueil à l'aéroport"],
        excludedServices: ["تذاكر الطيران الدولية", "التأمين على السفر", "المصاريف الشخصية"],
        excludedServicesFr: ["Billets d'avion internationaux", "Assurance voyage", "Dépenses personnelles"],
        importantNotes: ["يجب أن يكون جواز السفر ساري المفعول لمدة 6 أشهر على الأقل"],
        importantNotesFr: ["Le passeport doit être valide au moins 6 mois"],
        whatToBring: ["جواز السفر", "ملابس مناسبة للطقس", "كاميرا"],
        whatToBringFr: ["Passeport", "Vêtements adaptés au climat", "Appareil photo"],
        status: "PUBLISHED",
        images: {
          create: p.images.map((url, i) => ({
            tenantId,
            fileKey: `seed-import-${p.slug}-${i}`,
            url,
            position: i,
            alt: p.nameFr,
            altFr: p.nameFr,
          })),
        },
        itineraryDays: {
          create: p.itinerary.map((day) => ({
            tenantId,
            dayNumber: day.dayNumber,
            title: day.title,
            titleFr: day.titleFr,
            description: day.description,
            descriptionFr: day.descriptionFr,
          })),
        },
        packageHotels: {
          create: [{ tenantId, hotelId: hotels[p.hotelSlug], position: 0 }],
        },
        packageActivities: {
          create: p.activitySlugs.map((slug, i) => ({
            tenantId,
            activityId: activities[slug],
            position: i,
          })),
        },
        ...(guides[p.citySlug]
          ? { packageGuides: { create: [{ tenantId, guideId: guides[p.citySlug], position: 0 }] } }
          : {}),
        ...(transportProviders[p.citySlug]
          ? {
              packageTransport: {
                create: [{ tenantId, transportProviderId: transportProviders[p.citySlug], position: 0 }],
              },
            }
          : {}),
      },
    });
    console.log(`Package: ${p.nameFr} (${pkg.id})`);
  }

  // ---------------------------------------------------------------------
  // Bonus real photos for already-seeded destinations — guarded so
  // reruns don't duplicate.
  // ---------------------------------------------------------------------
  async function addBonusImage(slug: string, url: string) {
    const dest = await prisma.destination.findUnique({ where: { tenantId_slug: { tenantId, slug } } });
    if (!dest) return;
    const exists = await prisma.destinationImage.findFirst({ where: { destinationId: dest.id, url } });
    if (exists) return;
    const last = await prisma.destinationImage.findFirst({
      where: { destinationId: dest.id },
      orderBy: { position: "desc" },
    });
    await prisma.destinationImage.create({
      data: {
        tenantId,
        destinationId: dest.id,
        url,
        position: (last?.position ?? -1) + 1,
        alt: dest.nameFr,
        altFr: dest.nameFr,
      },
    });
    console.log(`Bonus image added to ${slug}: ${url}`);
  }
  await addBonusImage("paris", "/seed-images/paris-night-bonus.jpg");
  await addBonusImage("istanbul", "/seed-images/istanbul-mosque-ferry-bonus.jpg");

  // ---------------------------------------------------------------------
  // Flights cover/gallery fix — the existing Flight row had a mismatched
  // cover photo. Its admin action requires a live session, so this is
  // updated directly here instead.
  // ---------------------------------------------------------------------
  const flight = await prisma.flight.findFirst({ where: { tenantId } });
  if (flight) {
    await prisma.flight.update({
      where: { id: flight.id },
      data: { coverImageKey: null, coverImageUrl: "/seed-images/flights-runway-sunset.jpg" },
    });
    const flightGalleryUrls = [
      "/seed-images/flights-wing-night-city.jpg",
      "/seed-images/flights-travel-prep-collage.jpg",
    ];
    for (const [i, url] of flightGalleryUrls.entries()) {
      const exists = await prisma.flightImage.findFirst({ where: { flightId: flight.id, url } });
      if (!exists) {
        await prisma.flightImage.create({
          data: { tenantId, flightId: flight.id, url, position: i + 1 },
        });
      }
    }
    console.log(`Flight cover/gallery updated: ${flight.id}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
