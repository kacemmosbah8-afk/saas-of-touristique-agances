/**
 * Reference data for settings selects: countries, currencies, languages,
 * timezones. Names are resolved through the Intl APIs so we only maintain
 * compact code lists, and display names stay correct without a data file.
 */

// ISO 3166-1 alpha-2 country codes (full official list).
const COUNTRY_CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AR","AS","AT","AU","AW","AZ","BA",
  "BB","BD","BE","BF","BG","BH","BI","BJ","BM","BN","BO","BR","BS","BT","BW",
  "BY","BZ","CA","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU",
  "CV","CW","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","ER","ES",
  "ET","FI","FJ","FM","FO","FR","GA","GB","GD","GE","GH","GI","GL","GM","GN",
  "GQ","GR","GT","GU","GW","GY","HK","HN","HR","HT","HU","ID","IE","IL","IN",
  "IQ","IR","IS","IT","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR",
  "KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA",
  "MC","MD","ME","MG","MH","MK","ML","MM","MN","MO","MR","MT","MU","MV","MW",
  "MX","MY","MZ","NA","NE","NG","NI","NL","NO","NP","NR","NZ","OM","PA","PE",
  "PF","PG","PH","PK","PL","PR","PT","PW","PY","QA","RO","RS","RU","RW","SA",
  "SB","SC","SD","SE","SG","SI","SK","SL","SM","SN","SO","SR","SS","ST","SV",
  "SY","SZ","TD","TG","TH","TJ","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","US","UY","UZ","VC","VE","VN","VU","WS","YE","ZA","ZM","ZW",
] as const;

const CURRENCY_CODES = [
  "USD","EUR","GBP","MAD","AED","SAR","QAR","KWD","BHD","OMR","EGP","TND",
  "DZD","TRY","CHF","SEK","NOK","DKK","PLN","CZK","HUF","RON","RUB","UAH",
  "INR","PKR","BDT","LKR","NPR","CNY","JPY","KRW","THB","VND","IDR","MYR",
  "SGD","PHP","HKD","TWD","AUD","NZD","CAD","MXN","BRL","ARS","CLP","COP",
  "PEN","ZAR","NGN","KES","GHS","XOF","XAF","ETB","TZS","UGX",
] as const;

const LANGUAGE_CODES = [
  "en","fr","ar","es","de","it","pt","nl","ru","tr","zh","ja","ko","hi","ur",
  "bn","id","ms","th","vi","pl","cs","sv","no","da","fi","el","he","ro","uk",
  "hu","sw","am","fa",
] as const;

export type ReferenceOption = { value: string; label: string };

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

function sorted(options: ReferenceOption[]): ReferenceOption[] {
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export const COUNTRIES: ReferenceOption[] = sorted(
  COUNTRY_CODES.map((code) => ({ value: code, label: regionNames.of(code) ?? code })),
);

const localizedRegionNames = new Map<"ar" | "fr", Intl.DisplayNames>();

/**
 * Same curated `COUNTRY_CODES` list as `COUNTRIES`, but with names resolved
 * in the visitor's own locale (ar/fr) instead of always English — for
 * public-storefront selects (e.g. the visa assistance form's destination
 * and nationality pickers) rather than the English-only admin settings UI.
 */
export function getCountryOptions(locale: "ar" | "fr"): ReferenceOption[] {
  let names = localizedRegionNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "region" });
    localizedRegionNames.set(locale, names);
  }
  const resolved = names;
  return sorted(COUNTRY_CODES.map((code) => ({ value: code, label: resolved.of(code) ?? code })));
}

export const CURRENCIES: ReferenceOption[] = sorted(
  CURRENCY_CODES.map((code) => ({
    value: code,
    label: `${code} — ${currencyNames.of(code) ?? code}`,
  })),
);

export const LANGUAGES: ReferenceOption[] = sorted(
  LANGUAGE_CODES.map((code) => ({
    value: code,
    label: languageNames.of(code) ?? code,
  })),
);

export const TIMEZONES: ReferenceOption[] = Intl.supportedValuesOf("timeZone").map(
  (tz) => ({ value: tz, label: tz.replace(/_/g, " ") }),
);
