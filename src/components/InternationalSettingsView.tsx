import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  Bike,
  Car,
  CheckCircle2,
  Cloud,
  CreditCard,
  ExternalLink,
  Globe,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import { getUi } from '../data/uiTranslations';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  buildScheduledMaintenanceReminders,
  getActivePushSubscription,
  isWebPushSupported,
  sendTestScheduledPush,
  subscribeAndSchedulePush,
  unsubscribePush,
} from '../services/pushClient';
import {
  CountryCode,
  LanguageCode,
  MaintenanceItem,
  ServiceLog,
  UnitSystem,
  UserPreferences,
  UserSubscriptionRecord,
  Vehicle,
} from '../types/autolife';
import { formatDistance } from '../utils/autolife';
import {
  COUNTRY_CATALOG,
  COUNTRY_LIST,
  getLocalizedCountryName,
} from '../utils/billing';
import {
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  sanitizeWhatsAppNumber,
} from '../utils/whatsapp';
import { VehicleVisual } from './VehicleVisual';

interface InternationalSettingsViewProps {
  prefs: UserPreferences;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
  t: Translations;
  vehicles: Vehicle[];
  activeVehicleId: string;
  logs: ServiceLog[];
  maintenanceItems: MaintenanceItem[];
  cloudUserId: string | null;
  cloudUserEmail: string | null;
  cloudUserName: string | null;
  vehicleLimit: number | null;
  activePlanName: string;
  subscription: UserSubscriptionRecord | null;
  onOpenPlans: () => void;
  onSyncNow: () => Promise<void>;
  onSelectVehicle: (id: string) => void;
  onOpenAddVehicle: () => void;
  onRequestDeleteVehicle: (vehicleId: string) => void;
  onResetAutoRegion?: () => Promise<void> | void;
}

const SETTINGS_EXTRA_COPY: Record<
  LanguageCode,
  {
    connectedAs: string;
    authenticatedAccount: string;
    emailPh: string;
    passwordPh: string;
    authError: string;
    syncError: string;
    cascadeDeleteHint: string;
    pushCountSuffix: string;
    regionAutoHint: string;
    metricTitle: string;
    imperialTitle: string;
    testWaBtn: string;
    waTestMessage: string;
    waSavedPrefix: string;
    waRemovedMsg: string;
  }
> = {
  pt: {
    connectedAs: 'Conectado como',
    authenticatedAccount: 'Conta autenticada',
    emailPh: 'seu@email.com',
    passwordPh: 'Senha (mín. 6 caracteres)',
    authError: 'Erro na autenticação',
    syncError: 'Não foi possível sincronizar agora.',
    cascadeDeleteHint: 'Ao apagar um veículo, histórico e fotos também são excluídos.',
    pushCountSuffix: 'itens',
    regionAutoHint:
      'Detectado automaticamente pela sua região; ajuste manualmente quando preferir outra moeda ou país.',
    metricTitle: 'Métrico (km)',
    imperialTitle: 'Imperial (mi)',
    testWaBtn: 'Testar WhatsApp',
    waTestMessage: '*AutoLife World*\nWhatsApp conectado com sucesso!',
    waSavedPrefix: 'Número salvo:',
    waRemovedMsg: 'Número de WhatsApp removido.',
  },
  en: {
    connectedAs: 'Signed in as',
    authenticatedAccount: 'Authenticated account',
    emailPh: 'you@email.com',
    passwordPh: 'Password (min. 6 characters)',
    authError: 'Authentication error',
    syncError: 'Unable to sync right now.',
    cascadeDeleteHint: 'Deleting a vehicle also removes its service logs and attachments.',
    pushCountSuffix: 'items',
    regionAutoHint:
      'Automatically detected from your country/region; adjust manually whenever you prefer another currency.',
    metricTitle: 'Metric (km)',
    imperialTitle: 'Imperial (mi)',
    testWaBtn: 'Test WhatsApp',
    waTestMessage: '*AutoLife World*\nWhatsApp connected successfully!',
    waSavedPrefix: 'Saved number:',
    waRemovedMsg: 'WhatsApp number removed.',
  },
  es: {
    connectedAs: 'Conectado como',
    authenticatedAccount: 'Cuenta autenticada',
    emailPh: 'tu@correo.com',
    passwordPh: 'Contraseña (mín. 6 caracteres)',
    authError: 'Error de autenticación',
    syncError: 'No se pudo sincronizar ahora.',
    cascadeDeleteHint: 'Al eliminar un vehículo también se borran su historial y fotos.',
    pushCountSuffix: 'elementos',
    regionAutoHint:
      'Detectado automáticamente según tu país; ajústalo manualmente si prefieres otra moneda o región.',
    metricTitle: 'Métrico (km)',
    imperialTitle: 'Imperial (mi)',
    testWaBtn: 'Probar WhatsApp',
    waTestMessage: '*AutoLife World*\n¡WhatsApp conectado correctamente!',
    waSavedPrefix: 'Número guardado:',
    waRemovedMsg: 'Número de WhatsApp eliminado.',
  },
  de: {
    connectedAs: 'Angemeldet als',
    authenticatedAccount: 'Authentifiziertes Konto',
    emailPh: 'du@email.de',
    passwordPh: 'Passwort (mind. 6 Zeichen)',
    authError: 'Authentifizierungsfehler',
    syncError: 'Synchronisierung derzeit nicht möglich.',
    cascadeDeleteHint: 'Beim Löschen eines Fahrzeugs werden auch Verlauf und Fotos entfernt.',
    pushCountSuffix: 'Einträge',
    regionAutoHint:
      'Automatisch für deine Region erkannt; bei Bedarf manuell auf ein anderes Land umstellen.',
    metricTitle: 'Metrisch (km)',
    imperialTitle: 'Imperial (mi)',
    testWaBtn: 'WhatsApp testen',
    waTestMessage: '*AutoLife World*\nWhatsApp erfolgreich verbunden!',
    waSavedPrefix: 'Gespeicherte Nummer:',
    waRemovedMsg: 'WhatsApp-Nummer entfernt.',
  },
  fr: {
    connectedAs: 'Connecté en tant que',
    authenticatedAccount: 'Compte authentifié',
    emailPh: 'vous@email.fr',
    passwordPh: 'Mot de passe (min. 6 caractères)',
    authError: "Erreur d'authentification",
    syncError: 'Impossible de synchroniser pour le moment.',
    cascadeDeleteHint: 'La suppression d’un véhicule supprime aussi son historique et ses photos.',
    pushCountSuffix: 'éléments',
    regionAutoHint:
      'Détecté automatiquement selon votre pays ; ajustez manuellement si vous préférez une autre devise.',
    metricTitle: 'Métrique (km)',
    imperialTitle: 'Impérial (mi)',
    testWaBtn: 'Tester WhatsApp',
    waTestMessage: '*AutoLife World*\nWhatsApp connecté avec succès !',
    waSavedPrefix: 'Numéro enregistré :',
    waRemovedMsg: 'Numéro WhatsApp supprimé.',
  },
};

export function InternationalSettingsView({
  prefs,
  onUpdatePrefs,
  t,
  vehicles,
  activeVehicleId,
  logs,
  maintenanceItems,
  cloudUserId,
  cloudUserEmail,
  cloudUserName,
  vehicleLimit,
  activePlanName,
  subscription,
  onOpenPlans,
  onSyncNow,
  onSelectVehicle,
  onOpenAddVehicle,
  onRequestDeleteVehicle,
  onResetAutoRegion,
}: InternationalSettingsViewProps) {
  const bundle = getUi(prefs.language);
  const ui = bundle.settingsUi;
  const waUi = bundle.whatsapp;
  const extra = SETTINGS_EXTRA_COPY[prefs.language] ?? SETTINGS_EXTRA_COPY.en;

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authWhatsapp, setAuthWhatsapp] = useState(prefs.whatsappNumber ?? '');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [detectingRegion, setDetectingRegion] = useState(false);
  const [regionMessage, setRegionMessage] = useState<string | null>(null);
  const [whatsappInput, setWhatsappInput] = useState(prefs.whatsappNumber ?? '');
  const [editingWhatsapp, setEditingWhatsapp] = useState(
    !sanitizeWhatsAppNumber(prefs.whatsappNumber, prefs.language)
  );
  const [whatsappSavedMsg, setWhatsappSavedMsg] = useState<string | null>(null);

  const supabaseReady = isSupabaseConfigured();
  const pushSupported = isWebPushSupported();
  const hasSavedWhatsapp = Boolean(sanitizeWhatsAppNumber(prefs.whatsappNumber, prefs.language));

  useEffect(() => {
    setWhatsappInput(prefs.whatsappNumber ?? '');
    if (sanitizeWhatsAppNumber(prefs.whatsappNumber, prefs.language)) {
      setEditingWhatsapp(false);
    }
  }, [prefs.whatsappNumber, prefs.language]);

  useEffect(() => {
    getActivePushSubscription()
      .then((sub) => setPushSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  const handleToggleBackgroundPush = async () => {
    setPushMessage(null);
    setPushBusy(true);
    try {
      if (pushSubscribed) {
        await unsubscribePush();
        setPushSubscribed(false);
        setScheduledCount(0);
        setPushMessage(ui.pushDisabledMsg);
      } else {
        const reminders = buildScheduledMaintenanceReminders(
          vehicles,
          maintenanceItems,
          prefs,
          t
        );
        const res = await subscribeAndSchedulePush(reminders, prefs.language);
        setPushSubscribed(true);
        setScheduledCount(res.scheduledCount);
        setPushMessage(`${ui.pushEnabledMsg} (${res.scheduledCount} ${extra.pushCountSuffix})`);
      }
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : ui.pushUnsupported);
    } finally {
      setPushBusy(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushMessage(null);
    setPushBusy(true);
    try {
      const msg = await sendTestScheduledPush(5, prefs.language);
      setPushMessage(msg);
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : ui.pushUnsupported);
    } finally {
      setPushBusy(false);
    }
  };

  const handleSupabaseAuth = async (mode: 'signin' | 'signup') => {
    if (!supabase || !authEmail.trim() || !authPassword) return;
    setAuthMessage(null);
    setIsAuthLoading(true);
    try {
      const cleanWa = authWhatsapp.trim();
      if (mode === 'signup' && cleanWa && !sanitizeWhatsAppNumber(cleanWa, prefs.language)) {
        throw new Error(ui.whatsappInvalidMsg);
      }
      const res =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({
              email: authEmail.trim(),
              password: authPassword,
            })
          : await supabase.auth.signUp({
              email: authEmail.trim(),
              password: authPassword,
              options: cleanWa ? { data: { whatsapp_number: cleanWa } } : undefined,
            });
      if (res.error) throw res.error;
      if (cleanWa) {
        onUpdatePrefs({ whatsappNumber: cleanWa });
      }
      setAuthMessage(mode === 'signup' ? ui.authSuccessSignUp : ui.authSuccessSignIn);
      setAuthPassword('');
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : extra.authError);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    if (!supabase) return;
    setAuthMessage(null);
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : extra.authError);
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthMessage(null);
  };

  const handleSyncWithFeedback = async () => {
    setIsSyncing(true);
    setAuthMessage(null);
    try {
      await onSyncNow();
      setAuthMessage(ui.syncedMsg);
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : extra.syncError);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.settings.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t.settings.subtitle}
        </p>
      </div>

      {/* Cloud Account & Sync */}
      <section className="autolife-glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {ui.accountTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              {supabaseReady ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{ui.accountSubtitle}</span>
                </>
              ) : (
                <span>{ui.localOnlyBadge}</span>
              )}
            </p>
          </div>
        </div>

        {!supabaseReady ? (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {ui.localOnlyBadge}
          </p>
        ) : cloudUserId || cloudUserEmail || cloudUserName ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {extra.connectedAs}{' '}
              <strong>
                {cloudUserName
                  ? cloudUserEmail
                    ? `${cloudUserName} (${cloudUserEmail})`
                    : cloudUserName
                  : cloudUserEmail || extra.authenticatedAccount}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => void handleSyncWithFeedback()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
              >
                {isSyncing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSyncing ? ui.syncingBtn : ui.syncGarageBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{ui.signOutBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={isAuthLoading}
                onClick={() => void handleOAuthLogin('google')}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>{ui.continueWith} Google</span>
              </button>

              <button
                type="button"
                disabled={isAuthLoading}
                onClick={() => void handleOAuthLogin('apple')}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-950 text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
                </svg>
                <span>{ui.continueWith} Apple</span>
              </button>

              <button
                type="button"
                disabled={isAuthLoading}
                onClick={() => void handleOAuthLogin('facebook')}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>{ui.continueWith} Facebook</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span>{ui.authOAuthHint}</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="email"
                placeholder={extra.emailPh}
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <input
                type="password"
                placeholder={extra.passwordPh}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <input
                type="tel"
                placeholder={bundle.app.waPlaceholder}
                value={authWhatsapp}
                onChange={(e) => setAuthWhatsapp(e.target.value)}
                className="px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isAuthLoading}
                  onClick={() => void handleSupabaseAuth('signin')}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white disabled:opacity-60"
                >
                  {ui.signInTab}
                </button>
                <button
                  type="button"
                  disabled={isAuthLoading}
                  onClick={() => void handleSupabaseAuth('signup')}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-60"
                >
                  {ui.signUpTab}
                </button>
              </div>
            </div>
          </div>
        )}

        {authMessage && (
          <p className="text-xs text-blue-600 dark:text-blue-400">{authMessage}</p>
        )}
      </section>

      {/* Client Vehicles Management (Add / Remove Vehicle + History Cascade) */}
      <section className="autolife-glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {ui.vehiclesTitle} ({vehicles.length}
                {vehicleLimit !== null ? ` / ${vehicleLimit}` : ''})
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {ui.vehiclesPlanUsage} <strong>{activePlanName}</strong>
              {subscription
                ? ` (${bundle.plansUi.statusLabels[subscription.status] ?? subscription.status})`
                : ''}{' '}
              · {extra.cascadeDeleteHint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenPlans}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{ui.upgradePlanBtn}</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddVehicle}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{ui.addVehicleBtn}</span>
            </button>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <div className="px-6 py-8 text-center space-y-3">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {bundle.sidebar.noVehicles}
            </p>
            <button
              type="button"
              onClick={onOpenAddVehicle}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{ui.addVehicleBtn}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
            {vehicles.map((v) => {
              const isSelected = v.id === activeVehicleId;
              const isMoto = v.vehicleType === 'motorcycle';
              const vLogsCount = logs.filter((l) => l.vehicleId === v.id).length;
              return (
                <div
                  key={v.id}
                  className={`px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectVehicle(v.id)}
                    className="flex items-center gap-3 text-left min-w-0 flex-1"
                  >
                    <div className="w-14 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 shrink-0">
                      <VehicleVisual vehicle={v} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                        {isMoto ? (
                          <Bike className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                        ) : (
                          <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">
                          {v.make} {v.model} ({v.year})
                          {isSelected ? ` · ${ui.activeBadge}` : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                        <span className="font-mono">{v.plate}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t.powertrain[v.powertrain]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{formatDistance(v.odometerKm, prefs.units)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {vLogsCount} {bundle.medicalUi.summaryRecords.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
                    <button
                      type="button"
                      onClick={() => onRequestDeleteVehicle(v.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{ui.removeBtn}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Registered WhatsApp Integration (saved once permanently) */}
      <section className="autolife-glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {ui.whatsappTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {ui.whatsappDesc}
            </p>
          </div>
          {hasSavedWhatsapp && (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{formatWhatsAppDisplay(prefs.whatsappNumber, prefs.language)}</span>
            </span>
          )}
        </div>

        {hasSavedWhatsapp && !editingWhatsapp ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="text-xs text-slate-700 dark:text-slate-200">
              {extra.waSavedPrefix}{' '}
              <strong className="font-mono">
                {formatWhatsAppDisplay(prefs.whatsappNumber, prefs.language)}
              </strong>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const testUrl = buildWhatsAppUrl(
                  prefs.whatsappNumber,
                  prefs.language,
                  extra.waTestMessage
                );
                if (!testUrl) return null;
                return (
                  <a
                    href={testUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{extra.testWaBtn}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                );
              })()}
              <button
                type="button"
                onClick={() => {
                  setWhatsappInput(prefs.whatsappNumber ?? '');
                  setWhatsappSavedMsg(null);
                  setEditingWhatsapp(true);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
              >
                {bundle.garageUi.actions.edit}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = whatsappInput.trim();
              if (clean && !sanitizeWhatsAppNumber(clean, prefs.language)) {
                setWhatsappSavedMsg(ui.whatsappInvalidMsg);
                return;
              }
              onUpdatePrefs({ whatsappNumber: clean });
              if (clean) {
                setEditingWhatsapp(false);
                setWhatsappSavedMsg(ui.whatsappSavedMsg);
              } else {
                setWhatsappSavedMsg(extra.waRemovedMsg);
              }
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="tel"
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              placeholder={waUi.inputPlaceholder}
              className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              {ui.whatsappSaveBtn}
            </button>
            {hasSavedWhatsapp && (
              <button
                type="button"
                onClick={() => {
                  setWhatsappInput(prefs.whatsappNumber ?? '');
                  setEditingWhatsapp(false);
                }}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                {waUi.cancel}
              </button>
            )}
          </form>
        )}

        {whatsappSavedMsg && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{whatsappSavedMsg}</p>
        )}
      </section>

      {/* Country, Units & Theme */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="autolife-glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {ui.regionCountryLabel}
              </h2>
            </div>
            {onResetAutoRegion && (
              <button
                type="button"
                disabled={detectingRegion}
                onClick={async () => {
                  setDetectingRegion(true);
                  setRegionMessage(null);
                  try {
                    await onResetAutoRegion();
                    setRegionMessage(ui.regionAutoApplied);
                  } finally {
                    setDetectingRegion(false);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {detectingRegion ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>{ui.regionAutoBtn}</span>
              </button>
            )}
          </div>
          <select
            value={prefs.countryCode ?? 'BR'}
            onChange={(e) => {
              const code = e.target.value as CountryCode;
              const cfg = COUNTRY_CATALOG[code];
              setRegionMessage(null);
              onUpdatePrefs({
                countryCode: code,
                currency: cfg?.defaultCurrency ?? prefs.currency,
              });
            }}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {COUNTRY_LIST.map((c) => (
              <option key={c.code} value={c.code}>
                {getLocalizedCountryName(c.code, prefs.language)} ({c.defaultCurrency})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {regionMessage || extra.regionAutoHint}
          </p>
        </section>

        <section className="autolife-glass rounded-2xl p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t.settings.unitsLabel}
          </h2>
          <div className="space-y-2">
            {(
              [
                { id: 'metric', title: extra.metricTitle, desc: t.settings.metricDesc },
                { id: 'imperial', title: extra.imperialTitle, desc: t.settings.imperialDesc },
              ] as { id: UnitSystem; title: string; desc: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdatePrefs({ units: opt.id })}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  prefs.units === opt.id
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {opt.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="autolife-glass rounded-2xl p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t.settings.themeLabel}
          </h2>
          <div className="space-y-2">
            {(
              [
                { id: 'light', label: t.settings.light },
                { id: 'dark', label: t.settings.dark },
              ] as const
            ).map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => onUpdatePrefs({ theme: th.id })}
                className={`w-full px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-colors ${
                  prefs.theme === th.id
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Configurable Smart Reminders + Service Worker Background Web Push */}
      <section className="autolife-glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {ui.pushTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {ui.pushDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pushSupported ? (
              <>
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={() => void handleToggleBackgroundPush()}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    pushSubscribed
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-blue-600 text-white'
                  }`}
                >
                  {pushBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : pushSubscribed ? (
                    <BellOff className="w-3.5 h-3.5" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {pushSubscribed
                      ? `${ui.pushDisableBtn} (${scheduledCount || maintenanceItems.length} ${extra.pushCountSuffix})`
                      : ui.pushEnableBtn}
                  </span>
                </button>

                {pushSubscribed && (
                  <button
                    type="button"
                    disabled={pushBusy}
                    onClick={() => void handleSendTestPush()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{ui.pushTestBtn}</span>
                  </button>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {ui.pushUnsupported}
              </span>
            )}
          </div>
        </div>

        {pushMessage && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200">
            {pushMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.settings.oilInterval}
            </label>
            <input
              type="number"
              min={7}
              max={180}
              value={prefs.oilReminderDays}
              onChange={(e) =>
                onUpdatePrefs({ oilReminderDays: Math.max(7, Number(e.target.value) || 15) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.settings.tireInterval}
            </label>
            <input
              type="number"
              min={7}
              max={90}
              value={prefs.tireReminderDays}
              onChange={(e) =>
                onUpdatePrefs({ tireReminderDays: Math.max(7, Number(e.target.value) || 15) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.settings.coolantInterval}
            </label>
            <input
              type="number"
              min={7}
              max={180}
              value={prefs.coolantReminderDays}
              onChange={(e) =>
                onUpdatePrefs({ coolantReminderDays: Math.max(7, Number(e.target.value) || 30) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.settings.docAlertDays}
            </label>
            <input
              type="number"
              min={7}
              max={90}
              value={prefs.docReminderDays}
              onChange={(e) =>
                onUpdatePrefs({ docReminderDays: Math.max(7, Number(e.target.value) || 30) })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {ui.remindersSavedHint}
        </p>
      </section>
    </div>
  );
}
