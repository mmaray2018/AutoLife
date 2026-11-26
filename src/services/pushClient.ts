import { Translations } from '../data/i18n';
import {
  MaintenanceItem,
  MaintenanceStatus,
  UserPreferences,
  Vehicle,
} from '../types/autolife';
import { computeMaintenanceStatus } from '../utils/autolife';

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

      reminders.push({
        id: item.id,
        title: `${vehicle.make} ${vehicle.model} · ${itemLabel}`,
        body: isOverdueOrToday
          ? `Atenção: verificação de ${itemLabel} vencida ou prevista para hoje.`
          : `Lembrete programado: verificar ${itemLabel} (previsto para ${dueDate}).`,
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
  reminders: ScheduledReminderPayload[]
): Promise<{
  subscription: PushSubscription;
  scheduledCount: number;
  persistentVapidConfigured: boolean;
}> {
  if (!isWebPushSupported()) {
    throw new Error('Notificações Push via Service Worker não são suportadas neste navegador.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação negada no navegador.');
  }

  const keyRes = await fetch('/api/push/vapid-public-key');
  if (!keyRes.ok) throw new Error('Falha ao obter chave pública VAPID.');
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
    throw new Error(syncData.error || 'Falha ao registrar lembretes push.');
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

export async function sendTestScheduledPush(delaySeconds = 5): Promise<string> {
  const sub = await getActivePushSubscription();
  if (!sub) {
    throw new Error('Ative primeiro as notificações Push em segundo plano.');
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
    throw new Error(data.error || 'Falha ao enviar push de teste.');
  }
  return data.message || 'Notificação Push enviada pelo Service Worker!';
}
