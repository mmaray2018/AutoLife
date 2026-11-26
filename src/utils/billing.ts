import { BillingCycle, CurrencyCode, PaymentMethodType, PlanTier } from '../types/autolife';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  region: string;
  locale: string;
  decimals: number;
  /** Reference FX multiplier relative to 1.00 BRL */
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

/**
 * Converts a monetary amount recorded in `fromCurrency` into `toCurrency`
 * using reference FX rates so TCO & expense ledgers stay coherent globally.
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

/**
 * Localized SaaS tier pricing (clean market-specific price points per currency).
 * Annual cycle applies 20% discount (equivalent to ~2.4 months free).
 */
export const LOCALIZED_PLAN_PRICES: Record<
  PlanTier,
  Record<CurrencyCode, { monthly: number; annualMonthlyEq: number; annualTotal: number }>
> = {
  free: {
    BRL: { monthly: 0, annualMonthlyEq: 0, annualTotal: 0 },
    USD: { monthly: 0, annualMonthlyEq: 0, annualTotal: 0 },
    EUR: { monthly: 0, annualMonthlyEq: 0, annualTotal: 0 },
    GBP: { monthly: 0, annualMonthlyEq: 0, annualTotal: 0 },
    CAD: { monthly: 0, annualMonthlyEq: 0, annualTotal: 0 },
    CHF: { monthly: 0, annualMonthlyEq: 0, annualTotal: 0 },
    MXN: { monthly: 0, annualMonthlyEq: 0, annualTotal: 0 },
    JPY: { monthly: 0, annualMonthlyEq: 0, annualTotal: 0 },
  },
  plus: {
    BRL: { monthly: 19.9, annualMonthlyEq: 15.9, annualTotal: 190.8 },
    USD: { monthly: 4.99, annualMonthlyEq: 3.99, annualTotal: 47.88 },
    EUR: { monthly: 4.99, annualMonthlyEq: 3.99, annualTotal: 47.88 },
    GBP: { monthly: 3.99, annualMonthlyEq: 3.19, annualTotal: 38.28 },
    CAD: { monthly: 6.99, annualMonthlyEq: 5.59, annualTotal: 67.08 },
    CHF: { monthly: 4.5, annualMonthlyEq: 3.6, annualTotal: 43.2 },
    MXN: { monthly: 89, annualMonthlyEq: 71.2, annualTotal: 854.4 },
    JPY: { monthly: 750, annualMonthlyEq: 600, annualTotal: 7200 },
  },
  fleet: {
    BRL: { monthly: 149, annualMonthlyEq: 119, annualTotal: 1428 },
    USD: { monthly: 29.9, annualMonthlyEq: 23.9, annualTotal: 286.8 },
    EUR: { monthly: 27.9, annualMonthlyEq: 22.3, annualTotal: 267.6 },
    GBP: { monthly: 24.9, annualMonthlyEq: 19.9, annualTotal: 238.8 },
    CAD: { monthly: 39.9, annualMonthlyEq: 31.9, annualTotal: 382.8 },
    CHF: { monthly: 26.9, annualMonthlyEq: 21.5, annualTotal: 258 },
    MXN: { monthly: 549, annualMonthlyEq: 439, annualTotal: 5268 },
    JPY: { monthly: 4500, annualMonthlyEq: 3600, annualTotal: 43200 },
  },
};

export function getLocalizedPlanPrice(
  planId: PlanTier,
  currency: CurrencyCode,
  cycle: BillingCycle
): { displayMonthly: number; billedTotal: number } {
  const row = LOCALIZED_PLAN_PRICES[planId][currency] ?? LOCALIZED_PLAN_PRICES[planId].USD;
  if (cycle === 'annual') {
    return { displayMonthly: row.annualMonthlyEq, billedTotal: row.annualTotal };
  }
  return { displayMonthly: row.monthly, billedTotal: row.monthly };
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
