import {
  BillingCycle,
  CanonicalPlanId,
  CountryCode,
  CurrencyCode,
  LanguageCode,
  PaymentMethodType,
  PlanCountryPrice,
  PlanTier,
  SubscriptionPlanCatalogItem,
  UnitSystem,
} from '../types/autolife';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  region: string;
  locale: string;
  decimals: number;
  /** Reference FX multiplier relative to 1.00 BRL (used for historical service-log TCO aggregation) */
  fxPerBrl: number;
  paymentMethods: PaymentMethodType[];
  paymentSummary: string;
}

export const CURRENCY_CATALOG: Record<CurrencyCode, CurrencyConfig> = {
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Real Brasileiro',
    region: 'Brasil',
    locale: 'pt-BR',
    decimals: 2,
    fxPerBrl: 1.0,
    paymentMethods: ['card', 'pix', 'apple_google_pay'],
    paymentSummary: 'Pix · Cartão · Apple/Google Pay',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    region: 'USA / Global',
    locale: 'en-US',
    decimals: 2,
    fxPerBrl: 0.175,
    paymentMethods: ['card', 'apple_google_pay'],
    paymentSummary: 'Cartão Internacional · Apple/Google Pay',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    region: 'União Europeia',
    locale: 'de-DE',
    decimals: 2,
    fxPerBrl: 0.165,
    paymentMethods: ['card', 'sepa_debit', 'apple_google_pay'],
    paymentSummary: 'Cartão · Débito SEPA · Apple/Google Pay',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    region: 'United Kingdom',
    locale: 'en-GB',
    decimals: 2,
    fxPerBrl: 0.14,
    paymentMethods: ['card', 'apple_google_pay'],
    paymentSummary: 'Cartão UK/Global · Apple/Google Pay',
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    region: 'Canada',
    locale: 'en-CA',
    decimals: 2,
    fxPerBrl: 0.245,
    paymentMethods: ['card', 'apple_google_pay'],
    paymentSummary: 'Cartão · Apple/Google Pay',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    region: 'Schweiz / Suisse',
    locale: 'de-CH',
    decimals: 2,
    fxPerBrl: 0.155,
    paymentMethods: ['card', 'apple_google_pay'],
    paymentSummary: 'Cartão · Apple/Google Pay',
  },
  MXN: {
    code: 'MXN',
    symbol: 'MX$',
    name: 'Peso Mexicano',
    region: 'México',
    locale: 'es-MX',
    decimals: 2,
    fxPerBrl: 3.55,
    paymentMethods: ['card', 'apple_google_pay'],
    paymentSummary: 'Cartão · Apple/Google Pay',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    region: 'Japan',
    locale: 'ja-JP',
    decimals: 0,
    fxPerBrl: 27.0,
    paymentMethods: ['card', 'apple_google_pay'],
    paymentSummary: 'Cartão · Apple/Google Pay',
  },
};

export const CURRENCY_LIST: CurrencyConfig[] = Object.values(CURRENCY_CATALOG);

export interface CountryConfig {
  code: CountryCode;
  name: string;
  defaultCurrency: CurrencyCode;
  fallbackCountryCode: CountryCode;
}

export const COUNTRY_CATALOG: Record<CountryCode, CountryConfig> = {
  BR: { code: 'BR', name: 'Brasil', defaultCurrency: 'BRL', fallbackCountryCode: 'BR' },
  PT: { code: 'PT', name: 'Portugal', defaultCurrency: 'EUR', fallbackCountryCode: 'EU' },
  US: { code: 'US', name: 'United States', defaultCurrency: 'USD', fallbackCountryCode: 'GLOBAL' },
  GB: { code: 'GB', name: 'United Kingdom', defaultCurrency: 'GBP', fallbackCountryCode: 'GLOBAL' },
  ES: { code: 'ES', name: 'España', defaultCurrency: 'EUR', fallbackCountryCode: 'EU' },
  DE: { code: 'DE', name: 'Deutschland', defaultCurrency: 'EUR', fallbackCountryCode: 'EU' },
  FR: { code: 'FR', name: 'France', defaultCurrency: 'EUR', fallbackCountryCode: 'EU' },
  EU: { code: 'EU', name: 'Eurozone (EU)', defaultCurrency: 'EUR', fallbackCountryCode: 'EU' },
  CA: { code: 'CA', name: 'Canada', defaultCurrency: 'CAD', fallbackCountryCode: 'GLOBAL' },
  CH: { code: 'CH', name: 'Switzerland', defaultCurrency: 'CHF', fallbackCountryCode: 'GLOBAL' },
  MX: { code: 'MX', name: 'México', defaultCurrency: 'MXN', fallbackCountryCode: 'GLOBAL' },
  JP: { code: 'JP', name: 'Japan', defaultCurrency: 'JPY', fallbackCountryCode: 'GLOBAL' },
  GLOBAL: { code: 'GLOBAL', name: 'International (Global)', defaultCurrency: 'USD', fallbackCountryCode: 'GLOBAL' },
};

export const COUNTRY_LIST: CountryConfig[] = Object.values(COUNTRY_CATALOG);

export function inferCountryFromCurrency(currency: CurrencyCode): CountryCode {
  switch (currency) {
    case 'BRL':
      return 'BR';
    case 'EUR':
      return 'EU';
    case 'GBP':
      return 'GB';
    case 'CAD':
      return 'CA';
    case 'CHF':
      return 'CH';
    case 'MXN':
      return 'MX';
    case 'JPY':
      return 'JP';
    default:
      return 'US';
  }
}

export interface DetectedRegionDefaults {
  countryCode: CountryCode;
  currency: CurrencyCode;
  language: LanguageCode;
  units: UnitSystem;
}

const EUROZONE_TIMEZONES = new Set([
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Dublin',
  'Europe/Athens',
  'Europe/Helsinki',
  'Europe/Luxembourg',
  'Europe/Bratislava',
  'Europe/Ljubljana',
  'Europe/Tallinn',
  'Europe/Riga',
  'Europe/Vilnius',
  'Europe/Valletta',
  'Europe/Nicosia',
  'Europe/Zagreb',
]);

const BRAZIL_TIMEZONES = new Set([
  'America/Sao_Paulo',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/Manaus',
  'America/Bahia',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Araguaina',
  'America/Maceio',
  'America/Noronha',
  'America/Rio_Branco',
  'America/Boa_Vista',
  'America/Santarem',
]);

const US_TIMEZONE_PREFIXES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Detroit',
  'America/Boise',
  'America/Juneau',
  'America/Nome',
  'America/Sitka',
  'America/Yakutat',
  'America/Indiana/',
  'America/Kentucky/',
  'America/North_Dakota/',
  'Pacific/Honolulu',
];

const CANADA_TIMEZONES = new Set([
  'America/Toronto',
  'America/Vancouver',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'America/Montreal',
  'America/St_Johns',
  'America/Regina',
  'America/Moncton',
]);

const MEXICO_TIMEZONES = new Set([
  'America/Mexico_City',
  'America/Cancun',
  'America/Monterrey',
  'America/Tijuana',
  'America/Merida',
  'America/Chihuahua',
  'America/Mazatlan',
  'America/Hermosillo',
]);

function pickSupportedLanguage(rawLocales: string[], fallback: LanguageCode = 'en'): LanguageCode {
  for (const loc of rawLocales) {
    const base = loc.toLowerCase().split(/[-_]/)[0];
    if (base === 'pt' || base === 'en' || base === 'es' || base === 'de' || base === 'fr') {
      return base;
    }
  }
  return fallback;
}

export function resolveRegionForCountryCode(
  rawCountry: string,
  preferredLangs: string[] = []
): DetectedRegionDefaults {
  const iso = rawCountry.trim().toUpperCase();
  const browserLang = pickSupportedLanguage(preferredLangs, 'en');

  switch (iso) {
    case 'BR':
      return { countryCode: 'BR', currency: 'BRL', language: 'pt', units: 'metric' };
    case 'PT':
      return { countryCode: 'PT', currency: 'EUR', language: 'pt', units: 'metric' };
    case 'US':
      return {
        countryCode: 'US',
        currency: 'USD',
        language: browserLang === 'es' ? 'es' : 'en',
        units: 'imperial',
      };
    case 'GB':
      return { countryCode: 'GB', currency: 'GBP', language: 'en', units: 'imperial' };
    case 'ES':
      return { countryCode: 'ES', currency: 'EUR', language: 'es', units: 'metric' };
    case 'DE':
      return { countryCode: 'DE', currency: 'EUR', language: 'de', units: 'metric' };
    case 'FR':
      return { countryCode: 'FR', currency: 'EUR', language: 'fr', units: 'metric' };
    case 'CH':
      return {
        countryCode: 'CH',
        currency: 'CHF',
        language: browserLang === 'fr' ? 'fr' : 'de',
        units: 'metric',
      };
    case 'CA':
      return {
        countryCode: 'CA',
        currency: 'CAD',
        language: browserLang === 'fr' ? 'fr' : 'en',
        units: 'metric',
      };
    case 'MX':
      return { countryCode: 'MX', currency: 'MXN', language: 'es', units: 'metric' };
    case 'JP':
      return { countryCode: 'JP', currency: 'JPY', language: 'en', units: 'metric' };
    case 'EU':
    case 'IT':
    case 'NL':
    case 'BE':
    case 'AT':
    case 'IE':
    case 'FI':
    case 'GR':
    case 'LU':
    case 'SK':
    case 'SI':
    case 'EE':
    case 'LV':
    case 'LT':
    case 'MT':
    case 'CY':
    case 'HR':
      return { countryCode: 'EU', currency: 'EUR', language: browserLang, units: 'metric' };
    default:
      return { countryCode: 'GLOBAL', currency: 'USD', language: browserLang, units: 'metric' };
  }
}

export function detectLocaleRegionDefaults(): DetectedRegionDefaults {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { countryCode: 'BR', currency: 'BRL', language: 'pt', units: 'metric' };
  }

  const locales = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? [...navigator.languages]
    : [navigator.language || 'en-US'];

  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    tz = '';
  }

  // 1. Timezone provides physical region signal even if OS language is English
  if (tz) {
    if (BRAZIL_TIMEZONES.has(tz)) return resolveRegionForCountryCode('BR', locales);
    if (tz === 'Europe/Lisbon' || tz === 'Atlantic/Azores' || tz === 'Atlantic/Madeira') {
      return resolveRegionForCountryCode('PT', locales);
    }
    if (tz === 'Europe/London') return resolveRegionForCountryCode('GB', locales);
    if (tz === 'Europe/Madrid' || tz === 'Atlantic/Canary') {
      return resolveRegionForCountryCode('ES', locales);
    }
    if (tz === 'Europe/Berlin' || tz === 'Europe/Busingen') {
      return resolveRegionForCountryCode('DE', locales);
    }
    if (tz === 'Europe/Paris') return resolveRegionForCountryCode('FR', locales);
    if (tz === 'Europe/Zurich') return resolveRegionForCountryCode('CH', locales);
    if (EUROZONE_TIMEZONES.has(tz)) return resolveRegionForCountryCode('EU', locales);
    if (US_TIMEZONE_PREFIXES.some((prefix) => tz === prefix || tz.startsWith(prefix))) {
      return resolveRegionForCountryCode('US', locales);
    }
    if (CANADA_TIMEZONES.has(tz)) return resolveRegionForCountryCode('CA', locales);
    if (MEXICO_TIMEZONES.has(tz)) return resolveRegionForCountryCode('MX', locales);
    if (tz === 'Asia/Tokyo') return resolveRegionForCountryCode('JP', locales);
  }

  // 2. Fallback to browser locale region subtag (e.g. pt-BR, en-GB, es-MX, de-DE)
  for (const loc of locales) {
    const parts = loc.split(/[-_]/);
    if (parts.length >= 2) {
      const regionSubtag = parts[parts.length - 1].toUpperCase();
      if (/^[A-Z]{2}$/.test(regionSubtag)) {
        return resolveRegionForCountryCode(regionSubtag, locales);
      }
    }
  }

  // 3. Language-only fallback
  const lang = pickSupportedLanguage(locales, 'en');
  if (lang === 'pt') return resolveRegionForCountryCode('BR', locales);
  if (lang === 'de') return resolveRegionForCountryCode('DE', locales);
  if (lang === 'fr') return resolveRegionForCountryCode('FR', locales);
  if (lang === 'es') return resolveRegionForCountryCode('ES', locales);
  return { countryCode: 'GLOBAL', currency: 'USD', language: lang, units: 'metric' };
}

export function normalizePlanTier(plan?: string | null): CanonicalPlanId {
  switch (plan) {
    case 'fleet':
    case 'fleet_10':
      return 'fleet_10';
    case 'fleet_25':
      return 'fleet_25';
    case 'fleet_50':
      return 'fleet_50';
    case 'fleet_100':
      return 'fleet_100';
    case 'enterprise':
      return 'enterprise';
    case 'personal':
    case 'free':
    case 'plus':
    default:
      return 'personal';
  }
}

export function isBusinessPlan(plan?: string | null): boolean {
  const canonical = normalizePlanTier(plan);
  return canonical !== 'personal';
}

/**
 * Converts a historical service log amount recorded in `fromCurrency` into `toCurrency`
 * for unified multi-currency ledger totals. Subscription checkout prices ALWAYS come
 * directly from the country/currency database tables — never via ad-hoc FX conversion.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  if (!Number.isFinite(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;
  const fromRate = CURRENCY_CATALOG[fromCurrency]?.fxPerBrl ?? 1;
  const toRate = CURRENCY_CATALOG[toCurrency]?.fxPerBrl ?? 1;
  const amountInBrl = amount / fromRate;
  return amountInBrl * toRate;
}

export function minorToMajor(minor: number, currency: CurrencyCode): number {
  const decimals = CURRENCY_CATALOG[currency]?.decimals ?? 2;
  return decimals === 0 ? minor : minor / Math.pow(10, decimals);
}

export interface PriceBreakdown {
  subtotalMinor: number;
  taxMinor: number;
  processingFeeMinor: number;
  totalMinor: number;
  displayMonthlyMajor: number;
  subtotalMajor: number;
  taxMajor: number;
  processingFeeMajor: number;
  totalMajor: number;
}

export function computePriceBreakdown(
  price: PlanCountryPrice,
  cycle: BillingCycle,
  currency: CurrencyCode
): PriceBreakdown {
  const subtotalMinor = cycle === 'annual' ? price.annualPriceMinor : price.monthlyPriceMinor;
  const taxMinor = Math.round((subtotalMinor * (price.taxRatePercent || 0)) / 100);
  const processingFeeMinor =
    subtotalMinor > 0
      ? Math.round((subtotalMinor * (price.processingFeePercent || 0)) / 100) +
        (price.processingFeeFixedMinor || 0)
      : 0;
  const totalMinor = subtotalMinor + taxMinor + processingFeeMinor;
  const monthlyEqMinor =
    cycle === 'annual' ? Math.round(price.annualPriceMinor / 12) : price.monthlyPriceMinor;

  return {
    subtotalMinor,
    taxMinor,
    processingFeeMinor,
    totalMinor,
    displayMonthlyMajor: minorToMajor(monthlyEqMinor, currency),
    subtotalMajor: minorToMajor(subtotalMinor, currency),
    taxMajor: minorToMajor(taxMinor, currency),
    processingFeeMajor: minorToMajor(processingFeeMinor, currency),
    totalMajor: minorToMajor(totalMinor, currency),
  };
}

/**
 * Offline fallback catalog strictly matching the `subscription_plans` and `plan_country_prices`
 * tables in `supabase/schema.sql`. Authoritative runtime prices come from GET /api/billing/catalog.
 */
const FALLBACK_PLAN_DEFS: Array<Omit<SubscriptionPlanCatalogItem, 'price'>> = [
  {
    id: 'personal',
    slug: 'personal',
    accountScope: 'personal',
    name: 'Plano Particular',
    description: 'Para proprietários individuais com 1 veículo e Passaporte Digital verificado.',
    vehicleLimit: 1,
    allowFleetPanel: false,
    allowTeamMembers: false,
    maxTeamMembers: 1,
    features: [
      '1 veículo cadastrado',
      'Passaporte Digital do Veículo',
      'Histórico imutável de quilometragem',
      'Histórico de manutenção e despesas',
      'Documentos e notas fiscais privados',
      'Alertas preventivos por data e km',
      'QR Code para consulta e compartilhamento autorizado',
    ],
    sortOrder: 1,
  },
  {
    id: 'fleet_10',
    slug: 'fleet-10',
    accountScope: 'business',
    name: 'Plano Frotas 10',
    description: 'Painel central empresarial para até 10 carros e motocicletas com gestão de equipe.',
    vehicleLimit: 10,
    allowFleetPanel: true,
    allowTeamMembers: true,
    maxTeamMembers: 10,
    features: [
      'Até 10 veículos (carros e motos)',
      'Painel central de gestão empresarial',
      'Histórico individual, despesas e documentação',
      'Controle de quilometragem e manutenção',
      'Alertas de revisões e vencimentos',
      'Relatórios gerais e individuais em PDF e CSV',
      'Gestão de responsáveis e permissões por empresa',
      'Passaporte Digital + QR Code de cada veículo',
    ],
    sortOrder: 2,
  },
  {
    id: 'fleet_25',
    slug: 'fleet-25',
    accountScope: 'business',
    name: 'Plano Frotas 25',
    description: 'Expansão operacional para empresas com até 25 veículos ativos.',
    vehicleLimit: 25,
    allowFleetPanel: true,
    allowTeamMembers: true,
    maxTeamMembers: 25,
    features: [
      'Até 25 veículos na frota unificada',
      'Todos os recursos do Plano Frotas 10',
      'Convites de motoristas e gestores com permissões',
      'Relatórios executivos consolidados',
    ],
    sortOrder: 3,
  },
  {
    id: 'fleet_50',
    slug: 'fleet-50',
    accountScope: 'business',
    name: 'Plano Frotas 50',
    description: 'Escala corporativa para operações regionais com até 50 veículos.',
    vehicleLimit: 50,
    allowFleetPanel: true,
    allowTeamMembers: true,
    maxTeamMembers: 50,
    features: [
      'Até 50 veículos na frota unificada',
      'Isolamento multiempresa dedicado',
      'Permissões granulares por responsável',
      'Auditoria de quilometragem e custos',
    ],
    sortOrder: 4,
  },
  {
    id: 'fleet_100',
    slug: 'fleet-100',
    accountScope: 'business',
    name: 'Plano Frotas 100',
    description: 'Alta capacidade para grandes frotas, locadoras e entregas até 100 veículos.',
    vehicleLimit: 100,
    allowFleetPanel: true,
    allowTeamMembers: true,
    maxTeamMembers: 100,
    features: [
      'Até 100 veículos ativos',
      'Gestão multi-equipe avançada',
      'Exportação gerencial completa em PDF e CSV',
      'Passaporte Digital verificável para toda a frota',
    ],
    sortOrder: 5,
  },
  {
    id: 'enterprise',
    slug: 'enterprise',
    accountScope: 'business',
    name: 'Empresarial Personalizado',
    description: 'Acima de 100 veículos, SLA dedicado e limites configuráveis no banco.',
    vehicleLimit: null,
    allowFleetPanel: true,
    allowTeamMembers: true,
    maxTeamMembers: null,
    features: [
      'Acima de 100 veículos e equipes sob medida',
      'Faturamento corporativo B2B',
      'Impostos e contrato regional dedicados',
      'Implantação prioritária',
    ],
    sortOrder: 6,
  },
];

const FALLBACK_PRICES_BY_CURRENCY: Record<
  CurrencyCode,
  Record<CanonicalPlanId, Omit<PlanCountryPrice, 'planId' | 'countryCode' | 'currencyCode'>>
> = {
  BRL: {
    personal: {
      monthlyPriceMinor: 499,
      annualPriceMinor: 4790,
      taxRatePercent: 0,
      taxLabel: 'Impostos inclusos',
      processingFeePercent: 3.99,
      processingFeeFixedMinor: 39,
    },
    fleet_10: {
      monthlyPriceMinor: 3990,
      annualPriceMinor: 38300,
      taxRatePercent: 0,
      taxLabel: 'Impostos inclusos',
      processingFeePercent: 3.99,
      processingFeeFixedMinor: 39,
    },
    fleet_25: {
      monthlyPriceMinor: 8990,
      annualPriceMinor: 86300,
      taxRatePercent: 0,
      taxLabel: 'Impostos inclusos',
      processingFeePercent: 3.99,
      processingFeeFixedMinor: 39,
    },
    fleet_50: {
      monthlyPriceMinor: 15990,
      annualPriceMinor: 153500,
      taxRatePercent: 0,
      taxLabel: 'Impostos inclusos',
      processingFeePercent: 3.99,
      processingFeeFixedMinor: 39,
    },
    fleet_100: {
      monthlyPriceMinor: 27990,
      annualPriceMinor: 268700,
      taxRatePercent: 0,
      taxLabel: 'Impostos inclusos',
      processingFeePercent: 3.99,
      processingFeeFixedMinor: 39,
    },
    enterprise: {
      monthlyPriceMinor: 49900,
      annualPriceMinor: 479000,
      taxRatePercent: 0,
      taxLabel: 'Sob consulta B2B',
      processingFeePercent: 0,
      processingFeeFixedMinor: 0,
    },
  },
  USD: {
    personal: {
      monthlyPriceMinor: 299,
      annualPriceMinor: 2870,
      taxRatePercent: 0,
      taxLabel: 'Local taxes may apply',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_10: {
      monthlyPriceMinor: 1490,
      annualPriceMinor: 14300,
      taxRatePercent: 0,
      taxLabel: 'Local taxes may apply',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_25: {
      monthlyPriceMinor: 2990,
      annualPriceMinor: 28700,
      taxRatePercent: 0,
      taxLabel: 'Local taxes may apply',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_50: {
      monthlyPriceMinor: 5490,
      annualPriceMinor: 52700,
      taxRatePercent: 0,
      taxLabel: 'Local taxes may apply',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_100: {
      monthlyPriceMinor: 9990,
      annualPriceMinor: 95900,
      taxRatePercent: 0,
      taxLabel: 'Local taxes may apply',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    enterprise: {
      monthlyPriceMinor: 19900,
      annualPriceMinor: 191000,
      taxRatePercent: 0,
      taxLabel: 'Custom Enterprise',
      processingFeePercent: 0,
      processingFeeFixedMinor: 0,
    },
  },
  EUR: {
    personal: {
      monthlyPriceMinor: 299,
      annualPriceMinor: 2870,
      taxRatePercent: 21,
      taxLabel: 'VAT / IVA estimada',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 25,
    },
    fleet_10: {
      monthlyPriceMinor: 1390,
      annualPriceMinor: 13340,
      taxRatePercent: 21,
      taxLabel: 'VAT / IVA estimada',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 25,
    },
    fleet_25: {
      monthlyPriceMinor: 2790,
      annualPriceMinor: 26780,
      taxRatePercent: 21,
      taxLabel: 'VAT / IVA estimada',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 25,
    },
    fleet_50: {
      monthlyPriceMinor: 4990,
      annualPriceMinor: 47900,
      taxRatePercent: 21,
      taxLabel: 'VAT / IVA estimada',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 25,
    },
    fleet_100: {
      monthlyPriceMinor: 8990,
      annualPriceMinor: 86300,
      taxRatePercent: 21,
      taxLabel: 'VAT / IVA estimada',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 25,
    },
    enterprise: {
      monthlyPriceMinor: 17900,
      annualPriceMinor: 171800,
      taxRatePercent: 21,
      taxLabel: 'VAT / IVA B2B',
      processingFeePercent: 0,
      processingFeeFixedMinor: 0,
    },
  },
  GBP: {
    personal: {
      monthlyPriceMinor: 249,
      annualPriceMinor: 2390,
      taxRatePercent: 20,
      taxLabel: 'UK VAT (20%)',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 20,
    },
    fleet_10: {
      monthlyPriceMinor: 1190,
      annualPriceMinor: 11420,
      taxRatePercent: 20,
      taxLabel: 'UK VAT (20%)',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 20,
    },
    fleet_25: {
      monthlyPriceMinor: 2390,
      annualPriceMinor: 22940,
      taxRatePercent: 20,
      taxLabel: 'UK VAT (20%)',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 20,
    },
    fleet_50: {
      monthlyPriceMinor: 4290,
      annualPriceMinor: 41180,
      taxRatePercent: 20,
      taxLabel: 'UK VAT (20%)',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 20,
    },
    fleet_100: {
      monthlyPriceMinor: 7990,
      annualPriceMinor: 76700,
      taxRatePercent: 20,
      taxLabel: 'UK VAT (20%)',
      processingFeePercent: 2.5,
      processingFeeFixedMinor: 20,
    },
    enterprise: {
      monthlyPriceMinor: 15900,
      annualPriceMinor: 152600,
      taxRatePercent: 20,
      taxLabel: 'UK VAT (20%)',
      processingFeePercent: 0,
      processingFeeFixedMinor: 0,
    },
  },
  CAD: {
    personal: {
      monthlyPriceMinor: 399,
      annualPriceMinor: 3830,
      taxRatePercent: 5,
      taxLabel: 'GST (5%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_10: {
      monthlyPriceMinor: 1990,
      annualPriceMinor: 19100,
      taxRatePercent: 5,
      taxLabel: 'GST (5%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_25: {
      monthlyPriceMinor: 3990,
      annualPriceMinor: 38300,
      taxRatePercent: 5,
      taxLabel: 'GST (5%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_50: {
      monthlyPriceMinor: 7290,
      annualPriceMinor: 69980,
      taxRatePercent: 5,
      taxLabel: 'GST (5%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_100: {
      monthlyPriceMinor: 12990,
      annualPriceMinor: 124700,
      taxRatePercent: 5,
      taxLabel: 'GST (5%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    enterprise: {
      monthlyPriceMinor: 24900,
      annualPriceMinor: 239000,
      taxRatePercent: 5,
      taxLabel: 'GST (5%)',
      processingFeePercent: 0,
      processingFeeFixedMinor: 0,
    },
  },
  CHF: {
    personal: {
      monthlyPriceMinor: 290,
      annualPriceMinor: 2780,
      taxRatePercent: 8.1,
      taxLabel: 'MWST (8.1%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_10: {
      monthlyPriceMinor: 1390,
      annualPriceMinor: 13340,
      taxRatePercent: 8.1,
      taxLabel: 'MWST (8.1%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_25: {
      monthlyPriceMinor: 2790,
      annualPriceMinor: 26780,
      taxRatePercent: 8.1,
      taxLabel: 'MWST (8.1%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_50: {
      monthlyPriceMinor: 4990,
      annualPriceMinor: 47900,
      taxRatePercent: 8.1,
      taxLabel: 'MWST (8.1%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    fleet_100: {
      monthlyPriceMinor: 8990,
      annualPriceMinor: 86300,
      taxRatePercent: 8.1,
      taxLabel: 'MWST (8.1%)',
      processingFeePercent: 2.9,
      processingFeeFixedMinor: 30,
    },
    enterprise: {
      monthlyPriceMinor: 17900,
      annualPriceMinor: 171800,
      taxRatePercent: 8.1,
      taxLabel: 'MWST (8.1%)',
      processingFeePercent: 0,
      processingFeeFixedMinor: 0,
    },
  },
  MXN: {
    personal: {
      monthlyPriceMinor: 4900,
      annualPriceMinor: 47000,
      taxRatePercent: 16,
      taxLabel: 'IVA (16%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 300,
    },
    fleet_10: {
      monthlyPriceMinor: 29900,
      annualPriceMinor: 287000,
      taxRatePercent: 16,
      taxLabel: 'IVA (16%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 300,
    },
    fleet_25: {
      monthlyPriceMinor: 59900,
      annualPriceMinor: 575000,
      taxRatePercent: 16,
      taxLabel: 'IVA (16%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 300,
    },
    fleet_50: {
      monthlyPriceMinor: 109900,
      annualPriceMinor: 1055000,
      taxRatePercent: 16,
      taxLabel: 'IVA (16%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 300,
    },
    fleet_100: {
      monthlyPriceMinor: 199900,
      annualPriceMinor: 1919000,
      taxRatePercent: 16,
      taxLabel: 'IVA (16%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 300,
    },
    enterprise: {
      monthlyPriceMinor: 349900,
      annualPriceMinor: 3359000,
      taxRatePercent: 16,
      taxLabel: 'IVA (16%)',
      processingFeePercent: 0,
      processingFeeFixedMinor: 0,
    },
  },
  JPY: {
    personal: {
      monthlyPriceMinor: 390,
      annualPriceMinor: 3740,
      taxRatePercent: 10,
      taxLabel: 'Consumption Tax (10%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 0,
    },
    fleet_10: {
      monthlyPriceMinor: 1980,
      annualPriceMinor: 19000,
      taxRatePercent: 10,
      taxLabel: 'Consumption Tax (10%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 0,
    },
    fleet_25: {
      monthlyPriceMinor: 3980,
      annualPriceMinor: 38200,
      taxRatePercent: 10,
      taxLabel: 'Consumption Tax (10%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 0,
    },
    fleet_50: {
      monthlyPriceMinor: 7480,
      annualPriceMinor: 71800,
      taxRatePercent: 10,
      taxLabel: 'Consumption Tax (10%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 0,
    },
    fleet_100: {
      monthlyPriceMinor: 13800,
      annualPriceMinor: 132480,
      taxRatePercent: 10,
      taxLabel: 'Consumption Tax (10%)',
      processingFeePercent: 3.6,
      processingFeeFixedMinor: 0,
    },
    enterprise: {
      monthlyPriceMinor: 24800,
      annualPriceMinor: 238080,
      taxRatePercent: 10,
      taxLabel: 'Consumption Tax (10%)',
      processingFeePercent: 0,
      processingFeeFixedMinor: 0,
    },
  },
};

export function buildFallbackPlanCatalog(
  countryCode: CountryCode,
  currency: CurrencyCode
): SubscriptionPlanCatalogItem[] {
  const currSet = FALLBACK_PRICES_BY_CURRENCY[currency] ?? FALLBACK_PRICES_BY_CURRENCY.USD;
  return FALLBACK_PLAN_DEFS.map((def) => {
    const p = currSet[def.id];
    return {
      ...def,
      price: {
        planId: def.id,
        countryCode,
        currencyCode: currency,
        ...p,
      },
    };
  });
}

export const PAYMENT_METHOD_LABELS: Record<
  PaymentMethodType,
  { title: string; subtitle: string }
> = {
  card: {
    title: 'Cartão de Crédito / Débito',
    subtitle: 'Visa, Mastercard, Amex (cobrança na moeda selecionada)',
  },
  pix: {
    title: 'Pix Instantâneo',
    subtitle: 'Disponível para pagamentos em Real (BRL)',
  },
  sepa_debit: {
    title: 'Débito Direto SEPA',
    subtitle: 'Disponível para contas bancárias na Zona do Euro (EUR)',
  },
  apple_google_pay: {
    title: 'Apple Pay / Google Pay',
    subtitle: 'Carteira digital com confirmação biométrica',
  },
};
