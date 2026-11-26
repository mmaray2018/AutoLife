import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  Bike,
  Car,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { Translations } from '../data/i18n';
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
  MaintenanceItem,
  ServiceLog,
  UnitSystem,
  UserPreferences,
  Vehicle,
} from '../types/autolife';
import { formatDistance } from '../utils/autolife';
import {
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  sanitizeWhatsAppNumber,
} from '../utils/whatsapp';

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
  onSyncNow: () => Promise<void>;
  onSelectVehicle: (id: string) => void;
  onOpenAddVehicle: () => void;
  onRequestDeleteVehicle: (vehicleId: string) => void;
}

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
  onSyncNow,
  onSelectVehicle,
  onOpenAddVehicle,
  onRequestDeleteVehicle,
}: InternationalSettingsViewProps) {
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
        setPushMessage('Notificações Push em segundo plano desativadas neste dispositivo.');
      } else {
        const reminders = buildScheduledMaintenanceReminders(
          vehicles,
          maintenanceItems,
          prefs,
          t
        );
        const res = await subscribeAndSchedulePush(reminders);
        setPushSubscribed(true);
        setScheduledCount(res.scheduledCount);
        setPushMessage(
          `Service Worker conectado! ${res.scheduledCount} lembretes preventivos agendados para envio mesmo com o app fechado.`
        );
      }
    } catch (err) {
      setPushMessage(
        err instanceof Error ? err.message : 'Não foi possível ativar notificações Push.'
      );
    } finally {
      setPushBusy(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushMessage(null);
    setPushBusy(true);
    try {
      const msg = await sendTestScheduledPush(5);
      setPushMessage(
        `${msg} Minimize ou feche a aba agora para ver o alerta do Service Worker.`
      );
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : 'Falha no push de teste.');
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
        throw new Error('WhatsApp inválido. Informe com DDI e DDD (ex.: +55 11 99999-8888).');
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
      setAuthMessage(
        mode === 'signup'
          ? 'Conta criada! E-mail e WhatsApp vinculados. Verifique seu e-mail se a confirmação estiver ativa.'
          : 'Conectado ao Supabase! Seus veículos e arquivos já podem ser sincronizados.'
      );
      setAuthPassword('');
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Erro na autenticação');
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
      setAuthMessage(err instanceof Error ? err.message : `Erro ao entrar com ${provider}.`);
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
      setAuthMessage('Garagem, histórico e preferências sincronizados com sucesso.');
    } catch (err) {
      setAuthMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível sincronizar agora. Tente novamente em instantes.'
      );
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
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Conta &amp; Sincronização na Nuvem
              </h2>
            </div>
            {supabaseReady && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Sincronização segura multi-dispositivo ativa</span>
              </p>
            )}
          </div>
        </div>

        {!supabaseReady ? (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Sincronização em nuvem indisponível no momento. Seus dados continuam salvos localmente neste dispositivo.
          </p>
        ) : cloudUserId || cloudUserEmail || cloudUserName ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              Conectado como{' '}
              <strong>
                {cloudUserName
                  ? cloudUserEmail
                    ? `${cloudUserName} (${cloudUserEmail})`
                    : cloudUserName
                  : cloudUserEmail || 'Conta autenticada'}
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
                <span>Sincronizar Garagem</span>
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
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
                <span>Entrar com Google</span>
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
                <span>Entrar com Apple</span>
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
                <span>Entrar com Facebook</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span>ou entre com e-mail e senha</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="email"
                placeholder="seu@email.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <input
                type="password"
                placeholder="Senha (mín. 6 caracteres)"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <input
                type="tel"
                placeholder="WhatsApp (ex.: +55 11 99999-8888)"
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
                  Entrar
                </button>
                <button
                  type="button"
                  disabled={isAuthLoading}
                  onClick={() => void handleSupabaseAuth('signup')}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-60"
                >
                  Criar Conta
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
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Meus Veículos ({vehicles.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adicione um novo veículo ou remova um cadastrado (ao apagar, todo o histórico e fotos dele também são excluídos).
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddVehicle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.actions.addVehicle}</span>
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="px-6 py-8 text-center space-y-3">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Nenhum veículo cadastrado na sua conta ainda.
            </p>
            <button
              type="button"
              onClick={onOpenAddVehicle}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.actions.addVehicle}</span>
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
                    {isMoto ? (
                      <Bike className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : (
                      <Car className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {v.make} {v.model} ({v.year})
                        {isSelected ? ' · Ativo' : ''}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                        <span className="font-mono">{v.plate}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t.powertrain[v.powertrain]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{formatDistance(v.odometerKm, prefs.units)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {vLogsCount} registro{vLogsCount === 1 ? '' : 's'}
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
                      <span>Remover</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Registered WhatsApp Integration (saved once permanently) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                WhatsApp Cadastrado (Serviços &amp; Notas)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Salvo uma única vez: qualquer manutenção, revisão, abastecimento ou nota pode ser enviada direto para este número.
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
              Número salvo permanentemente:{' '}
              <strong className="font-mono">
                {formatWhatsAppDisplay(prefs.whatsappNumber, prefs.language)}
              </strong>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const testUrl = buildWhatsAppUrl(
                  prefs.whatsappNumber,
                  prefs.language,
                  `*AutoLife World*\nWhatsApp conectado com sucesso! Você receberá serviços, manutenções e notas por aqui.`
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
                    <span>Testar WhatsApp</span>
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
                Alterar número
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = whatsappInput.trim();
              if (clean && !sanitizeWhatsAppNumber(clean, prefs.language)) {
                setWhatsappSavedMsg(
                  'Número inválido. Informe com DDD/DDI (ex.: +55 11 99999-8888).'
                );
                return;
              }
              onUpdatePrefs({ whatsappNumber: clean });
              if (clean) {
                setEditingWhatsapp(false);
                setWhatsappSavedMsg('WhatsApp salvo permanentemente para todo o aplicativo.');
              } else {
                setWhatsappSavedMsg('Número de WhatsApp removido.');
              }
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="tel"
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              placeholder="Ex.: +55 11 99999-8888"
              className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Salvar WhatsApp
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
                Cancelar
              </button>
            )}
          </form>
        )}

        {whatsappSavedMsg && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{whatsappSavedMsg}</p>
        )}
      </section>

      {/* Units & Theme (2 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t.settings.unitsLabel}
          </h2>
          <div className="space-y-2">
            {(
              [
                { id: 'metric', title: 'Metric (km)', desc: t.settings.metricDesc },
                { id: 'imperial', title: 'Imperial (mi)', desc: t.settings.imperialDesc },
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

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
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
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {t.settings.remindersTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Service Worker Web Push: receba lembretes de manutenção agendados mesmo com o app fechado.
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
                      ? `Push Ativo (${scheduledCount || maintenanceItems.length} itens)`
                      : 'Ativar Push em 2º Plano'}
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
                    <span>Testar Push em 5s</span>
                  </button>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Web Push indisponível neste navegador (no iOS, instale na Tela Inicial).
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
      </section>

    </div>
  );
}
