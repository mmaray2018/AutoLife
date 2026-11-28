import { Translations } from '../data/i18n';
import {
  LanguageCode,
  MaintenanceItem,
  MaintenanceStatus,
  UserPreferences,
  Vehicle,
} from '../types/autolife';
import { computeMaintenanceStatus } from '../utils/autolife';

const PUSH_COPY: Record<
  LanguageCode,
  {
    overdueBody: (label: string) => string;
    upcomingBody: (label: string, date: string) => string;
    unsupported: string;
    denied: string;
    vapidFail: string;
    subscribeFail: string;
    enableFirst: string;
    testFail: string;
    testSent: string;
  }
> = {
  pt: {
    overdueBody: (label) => `Atenção: verificação de ${label} vencida ou prevista para hoje.`,
    upcomingBody: (label, date) => `Lembrete programado: verificar ${label} (previsto para ${date}).`,
    unsupported: 'Notificações Push via Service Worker não são suportadas neste navegador.',
    denied: 'Permissão de notificação negada no navegador.',
    vapidFail: 'Falha ao obter chave pública VAPID.',
    subscribeFail: 'Falha ao registrar lembretes push.',
    enableFirst: 'Ative primeiro as notificações Push em segundo plano.',
    testFail: 'Falha ao enviar push de teste.',
    testSent: 'Notificação Push enviada pelo Service Worker!',
  },
  en: {
    overdueBody: (label) => `Attention: ${label} check is overdue or due today.`,
    upcomingBody: (label, date) => `Scheduled reminder: inspect ${label} (due ${date}).`,
    unsupported: 'Service Worker Push Notifications are not supported in this browser.',
    denied: 'Notification permission denied in browser.',
    vapidFail: 'Failed to retrieve VAPID public key.',
    subscribeFail: 'Failed to register push reminders.',
    enableFirst: 'Enable background Push notifications first.',
    testFail: 'Failed to send test push notification.',
    testSent: 'Test Push notification sent by Service Worker!',
  },
  es: {
    overdueBody: (label) => `Atención: revisión de ${label} vencida o prevista para hoy.`,
    upcomingBody: (label, date) => `Recordatorio programado: revisar ${label} (previsto para ${date}).`,
    unsupported: 'Las notificaciones Push mediante Service Worker no son compatibles con este navegador.',
    denied: 'Permiso de notificación denegado en el navegador.',
    vapidFail: 'Error al obtener la clave pública VAPID.',
    subscribeFail: 'Error al registrar recordatorios push.',
    enableFirst: 'Activa primero las notificaciones Push en segundo plano.',
    testFail: 'Error al enviar notificación push de prueba.',
    testSent: '¡Notificación Push de prueba enviada!',
  },
  de: {
    overdueBody: (label) => `Achtung: Prüfung für ${label} überfällig oder heute fällig.`,
    upcomingBody: (label, date) => `Geplante Erinnerung: ${label} prüfen (fällig am ${date}).`,
    unsupported: 'Push-Benachrichtigungen über Service Worker werden von diesem Browser nicht unterstützt.',
    denied: 'Benachrichtigungsberechtigung im Browser verweigert.',
    vapidFail: 'VAPID-Schlüssel konnte nicht abgerufen werden.',
    subscribeFail: 'Push-Erinnerungen konnten nicht registriert werden.',
    enableFirst: 'Aktivieren Sie zuerst Hintergrund-Push-Benachrichtigungen.',
    testFail: 'Test-Push konnte nicht gesendet werden.',
    testSent: 'Test-Push-Benachrichtigung gesendet!',
  },
  fr: {
    overdueBody: (label) => `Attention : le contrôle de ${label} est en retard ou prévu aujourd’hui.`,
    upcomingBody: (label, date) => `Rappel planifié : vérifier ${label} (prévu le ${date}).`,
    unsupported: 'Les notifications Push via Service Worker ne sont pas prises en charge sur ce navigateur.',
    denied: 'Autorisation de notification refusée dans le navigateur.',
    vapidFail: 'Impossible de récupérer la clé publique VAPID.',
    subscribeFail: 'Échec de l’enregistrement des rappels push.',
    enableFirst: 'Activez d’abord les notifications Push en arrière-plan.',
    testFail: 'Échec de l’envoi du push de test.',
    testSent: 'Notification Push de test envoyée !',
  },
};

export interface ScheduledReminderPayload {
  id: string;
  title: string;
  body: string;
  dueAtIso: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function buildScheduledMaintenanceReminders(
  vehicles: Vehicle[],
  items: MaintenanceItem[],
  prefs: UserPreferences,
  t: Translations
): ScheduledReminderPayload[] {
  const reminders: ScheduledReminderPayload[] = [];
  for (const vehicle of vehicles) {
    const vItems = items.filter((it) => it.vehicleId === vehicle.id);
    for (const item of vItems) {
      const computed = computeMaintenanceStatus(item, vehicle, prefs);
      if (computed.status === MaintenanceStatus.PENDING || !computed.projectedDueDate) {
        continue;
      }
      const itemLabel = t.items[item.titleKey]?.title ?? item.titleKey;
      const dueDate = computed.projectedDueDate;
      // Schedule morning alert at 09:00 local time on projected due date (or +60s if already overdue)
      const isOverdueOrToday = computed.status === MaintenanceStatus.OVERDUE || computed.daysRemaining <= 0;
      const dueAtIso = isOverdueOrToday
        ? new Date(Date.now() + 60_000).toISOString()
        : `${dueDate}T09:00:00`;

      const c = PUSH_COPY[prefs.language] ?? PUSH_COPY.en;
      reminders.push({
        id: item.id,
        title: `${vehicle.make} ${vehicle.model} · ${itemLabel}`,
        body: isOverdueOrToday
          ? c.overdueBody(itemLabel)
          : c.upcomingBody(itemLabel, dueDate),
        dueAtIso,
      });
    }
  }
  return reminders;
}

export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeAndSchedulePush(
  reminders: ScheduledReminderPayload[],
  language: LanguageCode = 'en'
): Promise<{
  subscription: PushSubscription;
  scheduledCount: number;
  persistentVapidConfigured: boolean;
}> {
  const c = PUSH_COPY[language] ?? PUSH_COPY.en;
  if (!isWebPushSupported()) {
    throw new Error(c.unsupported);
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(c.denied);
  }

  const keyRes = await fetch('/api/push/vapid-public-key');
  if (!keyRes.ok) throw new Error(c.vapidFail);
  const { publicKey } = (await keyRes.json()) as { publicKey: string };

  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const syncRes = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      reminders,
    }),
  });
  const syncData = await syncRes.json();
  if (!syncRes.ok) {
    throw new Error(syncData.error || c.subscribeFail);
  }

  return {
    subscription,
    scheduledCount: Number(syncData.scheduledCount) || 0,
    persistentVapidConfigured: Boolean(syncData.persistentVapidConfigured),
  };
}

export async function syncPushScheduleIfActive(
  reminders: ScheduledReminderPayload[]
): Promise<void> {
  const sub = await getActivePushSubscription();
  if (!sub) return;
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      reminders,
    }),
  }).catch(() => {});
}

export async function unsubscribePush(): Promise<void> {
  const sub = await getActivePushSubscription();
  if (!sub) return;
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe();
}

export async function sendTestScheduledPush(
  delaySeconds = 5,
  language: LanguageCode = 'en'
): Promise<string> {
  const c = PUSH_COPY[language] ?? PUSH_COPY.en;
  const sub = await getActivePushSubscription();
  if (!sub) {
    throw new Error(c.enableFirst);
  }
  const res = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      delaySeconds,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || c.testFail);
  }
  return c.testSent;
}
