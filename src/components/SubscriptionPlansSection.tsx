import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  CreditCard,
  Globe,
  Loader2,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import {
  getAccessToken,
  manageUserSubscription,
} from '../services/enterpriseRepository';
import {
  BillingCycle,
  CanonicalPlanId,
  CountryCode,
  CurrencyCode,
  PaymentMethodType,
  SubscriptionPaymentRecord,
  SubscriptionPlanCatalogItem,
  UserPreferences,
  UserSubscriptionRecord,
} from '../types/autolife';
import { formatCurrency } from '../utils/autolife';
import {
  COUNTRY_CATALOG,
  COUNTRY_LIST,
  CURRENCY_CATALOG,
  CURRENCY_LIST,
  PAYMENT_METHOD_LABELS,
  computePriceBreakdown,
  minorToMajor,
  normalizePlanTier,
} from '../utils/billing';

interface SubscriptionPlansSectionProps {
  catalogPlans: SubscriptionPlanCatalogItem[];
  catalogSource: 'database' | 'fallback';
  subscription: UserSubscriptionRecord | null;
  payments: SubscriptionPaymentRecord[];
  vehiclesCount: number;
  prefs: UserPreferences;
  t: Translations;
  cloudUserId: string | null;
  cloudUserEmail?: string | null;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
  onSubscriptionUpdated: (sub: UserSubscriptionRecord | null) => void;
  onRefreshSubscription: () => Promise<void>;
}

interface PixCheckoutData {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  formattedAmount: string;
  planId: CanonicalPlanId;
  status: string;
}

const SUBSCRIPTION_STATUS_LABELS: Record<UserSubscriptionRecord['status'], string> = {
  active: 'Ativa',
  trialing: 'Em avaliação',
  past_due: 'Pagamento em atraso',
  grace_period: 'Período de tolerância (7 dias)',
  canceled: 'Cancelada',
  expired: 'Expirada (somente leitura para novos cadastros)',
};

export function SubscriptionPlansSection({
  catalogPlans,
  catalogSource,
  subscription,
  payments,
  vehiclesCount,
  prefs,
  t,
  cloudUserId,
  cloudUserEmail,
  onUpdatePrefs,
  onSubscriptionUpdated,
  onRefreshSubscription,
}: SubscriptionPlansSectionProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlanCatalogItem | null>(null);
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethodType>('card');
  const [payerEmail, setPayerEmail] = useState<string>(cloudUserEmail ?? '');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [subBusy, setSubBusy] = useState(false);
  const [checkoutFeedback, setCheckoutFeedback] = useState<{
    mode: 'error' | 'success';
    message: string;
  } | null>(null);
  const [pixCheckout, setPixCheckout] = useState<PixCheckoutData | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixVerifying, setPixVerifying] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);

  const activePlanId = normalizePlanTier(prefs.activePlan);
  const countryCode: CountryCode = prefs.countryCode ?? 'BR';
  const currencyMeta = CURRENCY_CATALOG[prefs.currency] ?? CURRENCY_CATALOG.BRL;

  useEffect(() => {
    if (cloudUserEmail && !payerEmail) {
      setPayerEmail(cloudUserEmail);
    }
  }, [cloudUserEmail, payerEmail]);

  useEffect(() => {
    if (!pixCheckout || pixConfirmed) return;
    let active = true;
    const poll = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(
          `/api/billing/verify-mp-payment?payment_id=${encodeURIComponent(pixCheckout.paymentId)}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );
        if (!res.ok || !active) return;
        const data = (await res.json()) as {
          verified?: boolean;
          planId?: CanonicalPlanId | null;
        };
        if (!active) return;
        if (data.verified) {
          setPixConfirmed(true);
          onUpdatePrefs({ activePlan: data.planId ?? pixCheckout.planId });
          await onRefreshSubscription();
          setCheckoutFeedback({
            mode: 'success',
            message: 'Pagamento Pix confirmado! Sua assinatura foi ativada e salva no histórico.',
          });
        }
      } catch {
        // Ignore transient polling failure
      }
    };
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pixCheckout, pixConfirmed, onUpdatePrefs, onRefreshSubscription]);

  const personalPlan = catalogPlans.find((p) => p.id === 'personal');
  const businessPlans = catalogPlans.filter((p) => p.accountScope === 'business');

  const handleSelectCountry = (nextCountry: CountryCode) => {
    const cfg = COUNTRY_CATALOG[nextCountry];
    onUpdatePrefs({
      countryCode: nextCountry,
      currency: cfg?.defaultCurrency ?? prefs.currency,
    });
  };

  const handleOpenCheckout = (plan: SubscriptionPlanCatalogItem) => {
    const allowedMethods = currencyMeta.paymentMethods;
    if (!allowedMethods.includes(checkoutMethod)) {
      setCheckoutMethod(allowedMethods[0]);
    }
    setPixCheckout(null);
    setPixConfirmed(false);
    setPixCopied(false);
    setCheckoutFeedback(null);
    setCheckoutPlan(plan);
  };

  const handleCurrencyChangeInCheckout = (nextCurrency: CurrencyCode) => {
    onUpdatePrefs({ currency: nextCurrency });
    const nextAllowed = CURRENCY_CATALOG[nextCurrency].paymentMethods;
    if (!nextAllowed.includes(checkoutMethod)) {
      setCheckoutMethod(nextAllowed[0]);
    }
    setPixCheckout(null);
    setPixConfirmed(false);
    setCheckoutFeedback(null);
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutPlan) return;
    setIsCheckingOut(true);
    setCheckoutFeedback(null);
    setPixCheckout(null);
    setPixConfirmed(false);
    try {
      const res = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: checkoutPlan.id,
          countryCode,
          currency: prefs.currency,
          billingCycle,
          paymentMethod: checkoutMethod,
          payerEmail: (payerEmail || cloudUserEmail || '').trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      if (data.mode === 'mercadopago_pix' && typeof data.qrCode === 'string' && data.paymentId) {
        setPixCheckout({
          paymentId: String(data.paymentId),
          qrCode: data.qrCode,
          qrCodeBase64: typeof data.qrCodeBase64 === 'string' ? data.qrCodeBase64 : '',
          ticketUrl: typeof data.ticketUrl === 'string' ? data.ticketUrl : '',
          formattedAmount: typeof data.formattedAmount === 'string' ? data.formattedAmount : '',
          planId: checkoutPlan.id,
          status: typeof data.status === 'string' ? data.status : 'pending',
        });
        return;
      }

      if (
        (data.mode === 'stripe_live' || data.mode === 'mercadopago_checkout') &&
        typeof data.checkoutUrl === 'string'
      ) {
        const parsed = new URL(data.checkoutUrl);
        if (parsed.protocol === 'https:') {
          window.location.assign(parsed.toString());
          return;
        }
      }

      setCheckoutFeedback({
        mode: 'error',
        message: 'Não foi possível iniciar o pagamento online. Verifique a configuração do gateway.',
      });
    } catch (err) {
      setCheckoutFeedback({
        mode: 'error',
        message: err instanceof Error ? err.message : 'Falha ao iniciar checkout.',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleManualVerifyPix = async () => {
    if (!pixCheckout) return;
    setPixVerifying(true);
    setCheckoutFeedback(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `/api/billing/verify-mp-payment?payment_id=${encodeURIComponent(pixCheckout.paymentId)}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao consultar pagamento Pix.');
      if (data.verified) {
        setPixConfirmed(true);
        onUpdatePrefs({ activePlan: data.planId ?? pixCheckout.planId });
        await onRefreshSubscription();
        setCheckoutFeedback({
          mode: 'success',
          message: 'Pagamento Pix confirmado! Sua assinatura foi ativada.',
        });
      } else {
        setCheckoutFeedback({
          mode: 'error',
          message:
            'Pagamento Pix ainda aguardando compensação. Conclua no app do seu banco e clique novamente em Verificar.',
        });
      }
    } catch (err) {
      setCheckoutFeedback({
        mode: 'error',
        message: err instanceof Error ? err.message : 'Erro ao verificar pagamento Pix.',
      });
    } finally {
      setPixVerifying(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (!pixCheckout?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixCheckout.qrCode);
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription || !cloudUserId) return;
    setSubBusy(true);
    try {
      const token = await getAccessToken();
      const updated = await manageUserSubscription(token, cloudUserId, {
        action: 'toggle_auto_renew',
        autoRenew: !subscription.autoRenew,
      });
      if (updated) onSubscriptionUpdated(updated);
    } finally {
      setSubBusy(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !cloudUserId) return;
    setSubBusy(true);
    try {
      const token = await getAccessToken();
      const updated = await manageUserSubscription(token, cloudUserId, { action: 'cancel' });
      if (updated) onSubscriptionUpdated(updated);
    } finally {
      setSubBusy(false);
    }
  };

  const activePlanObj = catalogPlans.find((p) => p.id === activePlanId);
  const currentLimit = activePlanObj?.vehicleLimit ?? null;
  const activeModalPlan = checkoutPlan
    ? catalogPlans.find((p) => p.id === checkoutPlan.id) ?? checkoutPlan
    : null;
  const activeModalBreakdown = activeModalPlan
    ? computePriceBreakdown(activeModalPlan.price, billingCycle, prefs.currency)
    : null;

  return (
    <section className="space-y-6">
      {/* Header + International Country / Currency + Billing Cycle */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t.garage.plansTitle}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Preços regionais configurados por país e moeda local ({catalogSource === 'database' ? 'catálogo sincronizado com banco de dados' : 'tabela regional oficial'}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              aria-label="País de cobrança"
              value={countryCode}
              onChange={(e) => handleSelectCountry(e.target.value as CountryCode)}
              className="text-xs font-medium bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none"
            >
              {COUNTRY_LIST.map((c) => (
                <option key={c.code} value={c.code} className="dark:bg-slate-900">
                  {c.name} ({c.defaultCurrency})
                </option>
              ))}
            </select>
          </div>

          <select
            aria-label="Moeda de cobrança"
            value={prefs.currency}
            onChange={(e) => onUpdatePrefs({ currency: e.target.value as CurrencyCode })}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          >
            {CURRENCY_LIST.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 w-fit shrink-0">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                billingCycle === 'monthly'
                  ? 'bg-slate-900 text-white dark:bg-blue-600'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                billingCycle === 'annual'
                  ? 'bg-slate-900 text-white dark:bg-blue-600'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Anual (-20%)
            </button>
          </div>
        </div>
      </div>

      {/* Active Subscription Management + Grace Period & History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Assinatura &amp; Limite Atual
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                {activePlanObj?.name ?? 'Plano Particular'}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                · {vehiclesCount}
                {currentLimit !== null ? ` / ${currentLimit}` : ''} veículo(s)
              </span>
              {subscription && (
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  · {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Seus veículos e históricos nunca são excluídos caso a assinatura vença ou seja cancelada.
              </span>
            </div>
          </div>

          {subscription && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="text-xs font-mono text-slate-600 dark:text-slate-300 mr-2">
                Vencimento: {subscription.currentPeriodEnd.slice(0, 10)}
              </div>
              <button
                type="button"
                disabled={subBusy}
                onClick={() => void handleToggleAutoRenew()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Renovação automática: {subscription.autoRenew ? 'Ativa' : 'Desativada'}
              </button>
              {subscription.status !== 'canceled' && (
                <button
                  type="button"
                  disabled={subBusy}
                  onClick={() => void handleCancelSubscription()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap shrink-0"
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
          )}
        </div>

        {(subscription?.status === 'grace_period' || subscription?.status === 'past_due') && (
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Assinatura em período de tolerância até{' '}
              <strong className="font-mono">
                {subscription.gracePeriodEnd?.slice(0, 10) || subscription.currentPeriodEnd.slice(0, 10)}
              </strong>
              . Regularize o pagamento para manter novos cadastros liberados.
            </span>
          </div>
        )}

        {payments.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Receipt className="w-3.5 h-3.5" />
              <span>Histórico de Pagamentos</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-36 overflow-y-auto text-xs tabular-nums">
              {payments.map((pay) => (
                <div key={pay.id} className="py-2 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-slate-500 mr-2">{pay.paidAt.slice(0, 10)}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {pay.planId} ({pay.paymentMethod})
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(minorToMajor(pay.amountMinor, pay.currencyCode), pay.currencyCode)}{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">· {pay.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Personal Plan vs Business Fleet Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Individual Consumer Tier */}
        {personalPlan && (() => {
          const br = computePriceBreakdown(personalPlan.price, billingCycle, prefs.currency);
          const isCurrent = activePlanId === 'personal';
          return (
            <div className="bg-white dark:bg-slate-900 border border-blue-600 dark:border-blue-500 rounded-xl p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <User className="w-3.5 h-3.5" />
                    <span>{personalPlan.name}</span>
                  </span>
                  {isCurrent && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Plano atual
                    </span>
                  )}
                </div>

                <div className="tabular-nums">
                  <div className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(br.displayMonthlyMajor, prefs.currency)} / mês
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {personalPlan.price.taxLabel}
                    {br.processingFeeMajor > 0
                      ? ` · Taxa est. ${formatCurrency(br.processingFeeMajor, prefs.currency)}`
                      : ''}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">{personalPlan.description}</p>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {personalPlan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCheckout(personalPlan)}
                className="w-full py-2.5 px-3 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0"
              >
                {isCurrent ? 'Renovar / Trocar Moeda' : `Assinar Plano Particular (${prefs.currency})`}
              </button>
            </div>
          );
        })()}

        {/* Expandable B2B Fleet Plans Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {businessPlans.map((plan) => {
            const br = computePriceBreakdown(plan.price, billingCycle, prefs.currency);
            const isCurrent = activePlanId === plan.id;
            const isEnterprise = plan.id === 'enterprise';
            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-5 flex flex-col justify-between gap-4 ${
                  isCurrent
                    ? 'border-blue-600 dark:border-blue-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{plan.name}</span>
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Ativo
                      </span>
                    )}
                  </div>

                  <div className="tabular-nums">
                    <div className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                      {isEnterprise
                        ? `A partir de ${formatCurrency(br.displayMonthlyMajor, prefs.currency)}`
                        : `${formatCurrency(br.displayMonthlyMajor, prefs.currency)} / mês`}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {plan.vehicleLimit !== null
                        ? `Até ${plan.vehicleLimit} veículos`
                        : 'Acima de 100 veículos'}{' '}
                      · {plan.price.taxLabel}
                    </div>
                  </div>

                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {plan.features.slice(0, 4).map((feat) => (
                      <li key={feat} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isEnterprise ? (
                  <a
                    href="mailto:empresas@autolife.world?subject=Plano%20Empresarial%20Personalizado%20AutoLife"
                    className="w-full py-2 px-3 text-center text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    Falar com Consultor B2B
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout(plan)}
                    className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-white whitespace-nowrap shrink-0"
                  >
                    {isCurrent
                      ? 'Gerenciar / Renovar'
                      : `Contratar ${plan.name} (${prefs.currency})`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Currency Checkout Modal */}
      {activeModalPlan && activeModalBreakdown && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {pixCheckout ? <QrCode className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                  <span>{pixCheckout ? 'Pagamento Instantâneo via Pix' : 'Pagamento Seguro Internacional'}</span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {activeModalPlan.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckoutPlan(null);
                  setPixCheckout(null);
                  setPixConfirmed(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label={t.actions.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pixCheckout ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center text-center space-y-3">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Escaneie o QR Code no app do seu banco ({pixCheckout.formattedAmount})
                  </div>
                  {pixCheckout.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixCheckout.qrCodeBase64}`}
                      alt="QR Code Pix"
                      className="w-48 h-48 rounded-lg bg-white p-2 border border-slate-200"
                    />
                  ) : null}
                  <div className="w-full space-y-1.5 text-left">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Pix Copia e Cola
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixCheckout.qrCode}
                        className="flex-1 px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCopyPixCode()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white whitespace-nowrap shrink-0"
                      >
                        {pixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{pixCopied ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {checkoutFeedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs ${
                      checkoutFeedback.mode === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                    }`}
                  >
                    <p>{checkoutFeedback.message}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPixCheckout(null);
                      setPixConfirmed(false);
                      setCheckoutFeedback(null);
                    }}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Trocar forma de pagamento
                  </button>
                  {pixConfirmed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutPlan(null);
                        setPixCheckout(null);
                      }}
                      className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Concluir
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pixVerifying}
                      onClick={() => void handleManualVerifyPix()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                    >
                      {pixVerifying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Verificar Pagamento Pix</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Moeda local
                    </label>
                    <select
                      value={prefs.currency}
                      onChange={(e) =>
                        handleCurrencyChangeInCheckout(e.target.value as CurrencyCode)
                      }
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {CURRENCY_LIST.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Ciclo de faturamento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`py-2 px-2 text-xs font-medium rounded-lg border ${
                          billingCycle === 'monthly'
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Mensal
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`py-2 px-2 text-xs font-medium rounded-lg border ${
                          billingCycle === 'annual'
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Anual (-20%)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Meios de pagamento ({currencyMeta.code})
                  </div>
                  <div className="space-y-2">
                    {currencyMeta.paymentMethods.map((method) => {
                      const info = PAYMENT_METHOD_LABELS[method];
                      const selected = checkoutMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setCheckoutMethod(method)}
                          className={`w-full p-3 rounded-lg border text-left flex items-center justify-between gap-3 transition-colors ${
                            selected
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {info.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {info.subtitle}
                            </div>
                          </div>
                          {selected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!cloudUserEmail && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      E-mail para comprovante (opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                {/* Transparent Price Breakdown (Subtotal + Tax + Processing Fee) */}
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs tabular-nums">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal do plano ({billingCycle === 'annual' ? 'Anual' : 'Mensal'})</span>
                    <span className="font-mono">
                      {formatCurrency(activeModalBreakdown.subtotalMajor, prefs.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{activeModalPlan.price.taxLabel || 'Impostos regionais'}</span>
                    <span className="font-mono">
                      {formatCurrency(activeModalBreakdown.taxMajor, prefs.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Taxa de processamento</span>
                    <span className="font-mono">
                      {formatCurrency(activeModalBreakdown.processingFeeMajor, prefs.currency)}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Total final</span>
                    <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(activeModalBreakdown.totalMajor, prefs.currency)}
                    </span>
                  </div>
                </div>

                {checkoutFeedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs ${
                      checkoutFeedback.mode === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                    }`}
                  >
                    <p>{checkoutFeedback.message}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCheckoutPlan(null)}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {t.actions.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={isCheckingOut}
                    onClick={() => void handleConfirmCheckout()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                  >
                    {isCheckingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {checkoutMethod === 'pix'
                        ? `Gerar QR Code Pix (${prefs.currency})`
                        : `Pagar com Cartão (${prefs.currency})`}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
