import { AlertTriangle, CheckCircle2, MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  AddVehicleModal,
  DeleteVehicleConfirmModal,
  LogCheckModal,
} from './components/ActionModals';
import { EvWorldView } from './components/EvWorldView';
import { GarageFleetView } from './components/GarageFleetView';
import { GlobalNetworkView } from './components/GlobalNetworkView';
import { HeaderBar } from './components/HeaderBar';
import { HealthMaintenanceView } from './components/HealthMaintenanceView';
import { InternationalSettingsView } from './components/InternationalSettingsView';
import { OfflineIndicator } from './components/PWAInstallButton';
import { SidebarNav } from './components/SidebarNav';
import { TRANSLATIONS } from './data/i18n';
import {
  DEFAULT_PREFERENCES,
  INITIAL_CHARGING_SESSIONS,
  INITIAL_MAINTENANCE_ITEMS,
  INITIAL_SERVICE_LOGS,
  INITIAL_VEHICLES,
} from './data/seedData';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import { listVehicleAttachments } from './services/storageRepository';
import {
  deleteVehicleFromCloud,
  fetchCloudSnapshot,
  insertChargingSessionToCloud,
  insertServiceLogToCloud,
  saveWhatsAppToUserMetadata,
  syncMaintenanceItemToCloud,
  syncPreferencesToCloud,
  syncVehicleToCloud,
} from './services/dataRepository';
import {
  buildScheduledMaintenanceReminders,
  syncPushScheduleIfActive,
} from './services/pushClient';
import {
  ChargingSession,
  CurrencyCode,
  DrivingProfile,
  MaintenanceCategory,
  MaintenanceItem,
  ModuleId,
  PowertrainType,
  ServiceLog,
  UserPreferences,
  Vehicle,
  VehicleAttachment,
} from './types/autolife';
import { todayIso } from './utils/autolife';
import { CURRENCY_CATALOG } from './utils/billing';
import { sanitizeWhatsAppNumber } from './utils/whatsapp';

const STORAGE_KEY = 'autolife_world_state_v2';
const LEGACY_STORAGE_KEY = 'autolife_world_state_v1';
const CURRENCY_STORAGE_KEY = 'autolife_preferred_currency';
const WHATSAPP_STORAGE_KEY = 'autolife_whatsapp_number';

interface PersistedState {
  vehicles: Vehicle[];
  activeVehicleId: string;
  items: MaintenanceItem[];
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  prefs: UserPreferences;
}

function resolveValidCurrency(candidate: unknown): CurrencyCode {
  if (typeof candidate === 'string' && candidate in CURRENCY_CATALOG) {
    return candidate as CurrencyCode;
  }
  return DEFAULT_PREFERENCES.currency;
}

function resolveUserName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const raw =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (typeof meta.user_name === 'string' && meta.user_name.trim()) ||
    '';
  return raw || null;
}

function loadInitialState(): PersistedState {
  const savedCurrency = (() => {
    try {
      return localStorage.getItem(CURRENCY_STORAGE_KEY);
    } catch {
      return null;
    }
  })();

  const savedWhatsapp = (() => {
    try {
      return (localStorage.getItem(WHATSAPP_STORAGE_KEY) ?? '').trim();
    } catch {
      return '';
    }
  })();

  try {
    // Limpa cache antigo que podia conter veiculos de demonstracao
    if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed.vehicles)) {
        const mergedPrefs: UserPreferences = {
          ...DEFAULT_PREFERENCES,
          ...(parsed.prefs || {}),
          currency: resolveValidCurrency(parsed.prefs?.currency ?? savedCurrency),
          whatsappNumber: parsed.prefs?.whatsappNumber?.trim() || savedWhatsapp || '',
        };
        const vehicles = parsed.vehicles.map((v) => ({
          ...v,
          vehicleType: v.vehicleType ?? 'car',
        }));
        const activeId =
          vehicles.find((v) => v.id === parsed.activeVehicleId)?.id ??
          vehicles[0]?.id ??
          '';
        return {
          vehicles,
          activeVehicleId: activeId,
          items: Array.isArray(parsed.items) ? parsed.items : INITIAL_MAINTENANCE_ITEMS,
          logs: Array.isArray(parsed.logs) ? parsed.logs : INITIAL_SERVICE_LOGS,
          chargingSessions: Array.isArray(parsed.chargingSessions)
            ? parsed.chargingSessions
            : INITIAL_CHARGING_SESSIONS,
          prefs: mergedPrefs,
        };
      }
    }
  } catch {
    // Fallback to clean empty state
  }

  return {
    vehicles: INITIAL_VEHICLES,
    activeVehicleId: INITIAL_VEHICLES[0]?.id ?? '',
    items: INITIAL_MAINTENANCE_ITEMS,
    logs: INITIAL_SERVICE_LOGS,
    chargingSessions: INITIAL_CHARGING_SESSIONS,
    prefs: {
      ...DEFAULT_PREFERENCES,
      currency: resolveValidCurrency(savedCurrency),
      whatsappNumber: savedWhatsapp,
    },
  };
}

function buildDefaultChecklistForVehicle(vehicle: Vehicle): MaintenanceItem[] {

  if (vehicle.vehicleType === 'motorcycle') {
    const isElectricMoto = vehicle.powertrain === PowertrainType.ELECTRIC;
    const isFleet = vehicle.fleetGroup === 'fleet';
    const motoItems: MaintenanceItem[] = [
      {
        id: `m-${vehicle.id}-chain`,
        vehicleId: vehicle.id,
        category: MaintenanceCategory.CHAIN_DRIVE,
        titleKey: 'chain_drive',
        descriptionKey: 'chain_drive',
        intervalDays: isFleet ? 7 : 10,
        intervalKm: 500,
        lastCheckedDate: '',
        lastCheckedKm: vehicle.odometerKm,
        safetyNoteKey: 'chain_drive',
      },
      {
        id: `m-${vehicle.id}-tires`,
        vehicleId: vehicle.id,
        category: MaintenanceCategory.TIRES,
        titleKey: 'moto_tires',
        descriptionKey: 'moto_tires',
        intervalDays: isFleet ? 7 : 10,
        intervalKm: 1000,
        lastCheckedDate: '',
        lastCheckedKm: vehicle.odometerKm,
        notes: `${vehicle.tirePressurePsi} PSI dianteiro / ${vehicle.rearTirePressurePsi ?? vehicle.tirePressurePsi + 4} PSI traseiro`,
      },
      {
        id: `m-${vehicle.id}-brakes`,
        vehicleId: vehicle.id,
        category: MaintenanceCategory.BRAKES,
        titleKey: 'moto_brakes',
        descriptionKey: 'moto_brakes',
        intervalDays: isFleet ? 30 : 60,
        intervalKm: isFleet ? 3000 : 5000,
        lastCheckedDate: '',
        lastCheckedKm: vehicle.odometerKm,
      },
      {
        id: `m-${vehicle.id}-suspension`,
        vehicleId: vehicle.id,
        category: MaintenanceCategory.SUSPENSION,
        titleKey: 'suspension',
        descriptionKey: 'suspension',
        intervalDays: 180,
        intervalKm: 12000,
        lastCheckedDate: '',
        lastCheckedKm: vehicle.odometerKm,
      },
      {
        id: `m-${vehicle.id}-battery`,
        vehicleId: vehicle.id,
        category: MaintenanceCategory.BATTERY,
        titleKey: 'battery',
        descriptionKey: 'battery',
        intervalDays: 90,
        intervalKm: 10000,
        lastCheckedDate: '',
        lastCheckedKm: vehicle.odometerKm,
      },
      {
        id: `m-${vehicle.id}-docs`,
        vehicleId: vehicle.id,
        category: MaintenanceCategory.DOCUMENTATION,
        titleKey: 'documentation',
        descriptionKey: 'documentation',
        intervalDays: 180,
        intervalKm: 50000,
        lastCheckedDate: '',
        lastCheckedKm: vehicle.odometerKm,
      },
      {
        id: `m-${vehicle.id}-rev`,
        vehicleId: vehicle.id,
        category: MaintenanceCategory.REVISION,
        titleKey: 'revision',
        descriptionKey: 'revision',
        intervalDays: isFleet ? 90 : 180,
        intervalKm: vehicle.manualSpec?.revisionIntervalKm ?? (isFleet ? 4000 : 6000),
        lastCheckedDate: '',
        lastCheckedKm: vehicle.odometerKm,
      },
    ];

    if (!isElectricMoto) {
      motoItems.unshift({
        id: `m-${vehicle.id}-oil`,
        vehicleId: vehicle.id,
        category: MaintenanceCategory.OIL,
        titleKey: 'moto_oil',
        descriptionKey: 'moto_oil',
        intervalDays: isFleet ? 20 : 60,
        intervalKm: vehicle.manualSpec?.oilIntervalKm ?? (isFleet ? 1500 : 3000),
        lastCheckedDate: '',
        lastCheckedKm: vehicle.odometerKm,
        notes: vehicle.manualSpec?.oilSpec,
        safetyNoteKey: 'moto_oil',
      });
    }

    if ((vehicle.engineDisplacementCc ?? 0) >= 250 || isElectricMoto) {
      motoItems.push({
        id: `m-${vehicle.id}-coolant`,
        vehicleId: vehicle.id,
        category: MaintenanceCategory.COOLANT,
        titleKey: 'coolant',
        descriptionKey: 'coolant',
        intervalDays: 30,
        intervalKm: 6000,
        lastCheckedDate: '',
        lastCheckedKm: vehicle.odometerKm,
        safetyNoteKey: 'coolant',
      });
    }

    return motoItems;
  }

  const base: MaintenanceItem[] = [
    {
      id: `m-${vehicle.id}-coolant`,
      vehicleId: vehicle.id,
      category: MaintenanceCategory.COOLANT,
      titleKey: 'coolant',
      descriptionKey: 'coolant',
      intervalDays: 30,
      intervalKm: 15000,
      lastCheckedDate: '',
      lastCheckedKm: vehicle.odometerKm,
      safetyNoteKey: 'coolant',
    },
    {
      id: `m-${vehicle.id}-tires`,
      vehicleId: vehicle.id,
      category: MaintenanceCategory.TIRES,
      titleKey: 'tires',
      descriptionKey: 'tires',
      intervalDays: 15,
      intervalKm: 2000,
      lastCheckedDate: '',
      lastCheckedKm: vehicle.odometerKm,
    },
    {
      id: `m-${vehicle.id}-battery`,
      vehicleId: vehicle.id,
      category: MaintenanceCategory.BATTERY,
      titleKey: 'battery',
      descriptionKey: 'battery',
      intervalDays: 90,
      intervalKm: 10000,
      lastCheckedDate: '',
      lastCheckedKm: vehicle.odometerKm,
    },
    {
      id: `m-${vehicle.id}-brakes`,
      vehicleId: vehicle.id,
      category: MaintenanceCategory.BRAKES,
      titleKey: 'brakes',
      descriptionKey: 'brakes',
      intervalDays: 90,
      intervalKm: 10000,
      lastCheckedDate: '',
      lastCheckedKm: vehicle.odometerKm,
    },
    {
      id: `m-${vehicle.id}-docs`,
      vehicleId: vehicle.id,
      category: MaintenanceCategory.DOCUMENTATION,
      titleKey: 'documentation',
      descriptionKey: 'documentation',
      intervalDays: 180,
      intervalKm: 50000,
      lastCheckedDate: '',
      lastCheckedKm: vehicle.odometerKm,
    },
    {
      id: `m-${vehicle.id}-rev`,
      vehicleId: vehicle.id,
      category: MaintenanceCategory.REVISION,
      titleKey: 'revision',
      descriptionKey: 'revision',
      intervalDays: 365,
      intervalKm:
        vehicle.manualSpec?.revisionIntervalKm ??
        (vehicle.powertrain === PowertrainType.ELECTRIC ? 20000 : 10000),
      lastCheckedDate: '',
      lastCheckedKm: vehicle.odometerKm,
    },
  ];

  if (vehicle.powertrain !== PowertrainType.ELECTRIC) {
    base.unshift({
      id: `m-${vehicle.id}-oil`,
      vehicleId: vehicle.id,
      category: MaintenanceCategory.OIL,
      titleKey: 'oil',
      descriptionKey: 'oil',
      intervalDays: 15,
      intervalKm: vehicle.manualSpec?.oilIntervalKm ?? 10000,
      lastCheckedDate: '',
      lastCheckedKm: vehicle.odometerKm,
      notes: vehicle.manualSpec?.oilSpec,
    });
    base.push({
      id: `m-${vehicle.id}-belt`,
      vehicleId: vehicle.id,
      category: MaintenanceCategory.TIMING_BELT,
      titleKey: 'timing_belt',
      descriptionKey: 'timing_belt',
      intervalDays: 1460,
      intervalKm: 60000,
      lastCheckedDate: '',
      lastCheckedKm: vehicle.odometerKm,
    });
  }

  return base;
}

export default function App() {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [activeModule, setActiveModule] = useState<ModuleId>('settings');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [logModalItem, setLogModalItem] = useState<MaintenanceItem | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [vehicleToDeleteId, setVehicleToDeleteId] = useState<string | null>(null);

  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null);
  const [cloudUserName, setCloudUserName] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<VehicleAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [onboardingWhatsappInput, setOnboardingWhatsappInput] = useState('');
  const [onboardingWhatsappError, setOnboardingWhatsappError] = useState<string | null>(null);
  const [dismissedWhatsappPrompt, setDismissedWhatsappPrompt] = useState(false);
  const latestStateRef = useRef(state);
  const hadAuthenticatedSessionRef = useRef(false);
  const userSelectedModuleRef = useRef(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  const handleSelectModule = (module: ModuleId) => {
    userSelectedModuleRef.current = true;
    setActiveModule(module);
  };

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const activeVehicle =
    state.vehicles.find((v) => v.id === state.activeVehicleId) ?? state.vehicles[0] ?? null;
  const activeVehicleId = activeVehicle?.id ?? '';
  const t = TRANSLATIONS[state.prefs.language] ?? TRANSLATIONS.pt;

  useEffect(() => {
    if (!cloudUserId || !activeVehicleId || !isSupabaseConfigured()) {
      setAttachments([]);
      setAttachmentsError(null);
      return;
    }
    let mounted = true;
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    listVehicleAttachments(cloudUserId, activeVehicleId)
      .then((rows) => {
        if (mounted) setAttachments(rows);
      })
      .catch((err) => {
        if (mounted) {
          setAttachments([]);
          setAttachmentsError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar as fotos/documentos salvos.'
          );
        }
      })
      .finally(() => {
        if (mounted) setAttachmentsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [cloudUserId, activeVehicleId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(CURRENCY_STORAGE_KEY, state.prefs.currency);
      const wa = state.prefs.whatsappNumber?.trim();
      if (wa) {
        localStorage.setItem(WHATSAPP_STORAGE_KEY, wa);
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.prefs.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.prefs.theme]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const syncLocalSnapshotToCloud = async (userId: string) => {
      const current = latestStateRef.current;
      await Promise.all([
        syncPreferencesToCloud(userId, current.prefs),
        ...current.vehicles.map((v) => syncVehicleToCloud(userId, v)),
        ...current.items.map((it) => syncMaintenanceItemToCloud(userId, it)),
        ...current.logs.map((lg) => insertServiceLogToCloud(userId, lg)),
        ...current.chargingSessions.map((cs) => insertChargingSessionToCloud(userId, cs)),
      ]);
    };

    const applyAuthenticatedUser = (
      user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
    ) => {
      hadAuthenticatedSessionRef.current = true;
      setCloudUserId(user.id);
      setCloudUserEmail(user.email ?? null);
      setCloudUserName(resolveUserName(user));

      const metaWhatsapp =
        typeof user.user_metadata?.whatsapp_number === 'string'
          ? user.user_metadata.whatsapp_number.trim()
          : '';
      if (metaWhatsapp) {
        setState((prev) => ({
          ...prev,
          prefs: {
            ...prev.prefs,
            whatsappNumber: prev.prefs.whatsappNumber?.trim() || metaWhatsapp,
          },
        }));
      }

      fetchCloudSnapshot(user.id)
        .then((snap) => {
          if (!active || !snap) return;
          const localWhatsapp = (latestStateRef.current.prefs.whatsappNumber ?? '').trim();
          const cloudWhatsapp = (snap.prefs?.whatsappNumber ?? '').trim();
          const effectiveWhatsapp = cloudWhatsapp || metaWhatsapp || localWhatsapp;

          if (effectiveWhatsapp && !metaWhatsapp) {
            void saveWhatsAppToUserMetadata(effectiveWhatsapp);
          }

          if (snap.vehicles.length === 0) {
            if (latestStateRef.current.vehicles.length > 0) {
              return syncLocalSnapshotToCloud(user.id).catch(() => {});
            }
            if (snap.prefs) {
              const mergedPrefs: UserPreferences = {
                ...snap.prefs,
                whatsappNumber: effectiveWhatsapp,
              };
              if (effectiveWhatsapp && !cloudWhatsapp) {
                void syncPreferencesToCloud(user.id, mergedPrefs).catch(() => {});
              }
              setState((prev) => ({
                ...prev,
                prefs: mergedPrefs,
              }));
            }
            return;
          }

          setState((prev) => {
            const prevWa = (prev.prefs.whatsappNumber ?? '').trim();
            const mergedWa = cloudWhatsapp || metaWhatsapp || prevWa || localWhatsapp;
            const mergedPrefs: UserPreferences = snap.prefs
              ? { ...snap.prefs, whatsappNumber: mergedWa }
              : { ...prev.prefs, whatsappNumber: mergedWa };
            if (mergedWa && !cloudWhatsapp) {
              void syncPreferencesToCloud(user.id, mergedPrefs).catch(() => {});
            }
            return {
              vehicles: snap.vehicles,
              activeVehicleId: snap.vehicles[0].id,
              items: snap.items,
              logs: snap.logs,
              chargingSessions: snap.chargingSessions,
              prefs: mergedPrefs,
            };
          });
        })
        .catch(() => {});
    };

    const clearOnSignOut = (isExplicitSignOut: boolean) => {
      setCloudUserId(null);
      setCloudUserEmail(null);
      setCloudUserName(null);
      if (isExplicitSignOut || hadAuthenticatedSessionRef.current) {
        hadAuthenticatedSessionRef.current = false;
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore storage error
        }
        setState((prev) => ({
          vehicles: [],
          activeVehicleId: '',
          items: [],
          logs: [],
          chargingSessions: [],
          prefs: prev.prefs,
        }));
      }
      if (isExplicitSignOut) {
        userSelectedModuleRef.current = false;
        setActiveModule('settings');
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user ?? null;
      if (user?.id) {
        applyAuthenticatedUser(user);
        if (!userSelectedModuleRef.current) {
          setActiveModule('health');
        }
      } else {
        clearOnSignOut(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      if (user?.id) {
        applyAuthenticatedUser(user);
      } else {
        clearOnSignOut(event === 'SIGNED_OUT');
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Verify live Stripe or Mercado Pago Checkout return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('checkout');
    const sessionId = params.get('session_id');
    const mpPaymentId = params.get('payment_id') || params.get('collection_id');

    if (checkoutState === 'success' && sessionId) {
      fetch(`/api/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.verified && (data.planId === 'plus' || data.planId === 'fleet')) {
            setState((prev) => {
              const nextPrefs = { ...prev.prefs, activePlan: data.planId };
              if (cloudUserId) void syncPreferencesToCloud(cloudUserId, nextPrefs);
              return { ...prev, prefs: nextPrefs };
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname);
        });
    } else if (checkoutState === 'mp_success' && mpPaymentId) {
      fetch(`/api/billing/verify-mp-payment?payment_id=${encodeURIComponent(mpPaymentId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.verified && (data.planId === 'plus' || data.planId === 'fleet')) {
            setState((prev) => {
              const nextPrefs = { ...prev.prefs, activePlan: data.planId };
              if (cloudUserId) void syncPreferencesToCloud(cloudUserId, nextPrefs);
              return { ...prev, prefs: nextPrefs };
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname);
        });
    } else if (checkoutState === 'cancelled' || checkoutState === 'mp_pending') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [cloudUserId]);

  // Keep Service Worker scheduled Push reminders synchronized when active
  useEffect(() => {
    const reminders = buildScheduledMaintenanceReminders(
      state.vehicles,
      state.items,
      state.prefs,
      t
    );
    void syncPushScheduleIfActive(reminders);
  }, [state.vehicles, state.items, state.prefs, t]);

  const handleSyncAllToCloud = async () => {
    if (!cloudUserId) return;
    await Promise.all([
      syncPreferencesToCloud(cloudUserId, state.prefs),
      ...state.vehicles.map((v) => syncVehicleToCloud(cloudUserId, v)),
      ...state.items.map((it) => syncMaintenanceItemToCloud(cloudUserId, it)),
      ...state.logs.map((lg) => insertServiceLogToCloud(cloudUserId, lg)),
      ...state.chargingSessions.map((cs) => insertChargingSessionToCloud(cloudUserId, cs)),
    ]);
  };

  const updatePrefs = (partial: Partial<UserPreferences>) => {
    if (partial.whatsappNumber !== undefined) {
      const cleanWa = partial.whatsappNumber.trim();
      try {
        if (cleanWa) {
          localStorage.setItem(WHATSAPP_STORAGE_KEY, cleanWa);
        } else {
          localStorage.removeItem(WHATSAPP_STORAGE_KEY);
        }
      } catch {
        // Ignore storage error
      }
      if (cloudUserId) {
        void saveWhatsAppToUserMetadata(cleanWa);
      }
    }
    setState((prev) => {
      const nextPrefs = { ...prev.prefs, ...partial };
      if (cloudUserId) void syncPreferencesToCloud(cloudUserId, nextPrefs).catch(() => {});
      return { ...prev, prefs: nextPrefs };
    });
  };

  const handleSelectVehicle = (id: string) => {
    setState((prev) => ({ ...prev, activeVehicleId: id }));
  };

  const handleUpdateOdometer = (vehicleId: string, newKm: number) => {
    setState((prev) => {
      const updatedVehicles = prev.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, odometerKm: newKm } : v
      );
      const changed = updatedVehicles.find((v) => v.id === vehicleId);
      if (cloudUserId && changed) void syncVehicleToCloud(cloudUserId, changed);
      return { ...prev, vehicles: updatedVehicles };
    });
  };

  const handleUpdateDrivingProfile = (
    vehicleId: string,
    drivingProfile: DrivingProfile,
    weeklyKm: number
  ) => {
    setState((prev) => {
      const updatedVehicles = prev.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, drivingProfile, weeklyKm } : v
      );
      const changed = updatedVehicles.find((v) => v.id === vehicleId);
      if (cloudUserId && changed) void syncVehicleToCloud(cloudUserId, changed);
      return { ...prev, vehicles: updatedVehicles };
    });
  };

  const handleAddVehicle = (newVehicle: Vehicle) => {
    const newChecklist = buildDefaultChecklistForVehicle(newVehicle);
    if (cloudUserId) {
      void syncVehicleToCloud(cloudUserId, newVehicle).then(() =>
        Promise.all(newChecklist.map((it) => syncMaintenanceItemToCloud(cloudUserId, it)))
      );
    }
    setState((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, newVehicle],
      activeVehicleId: newVehicle.id,
      items: [...prev.items, ...newChecklist],
    }));
    setShowAddVehicleModal(false);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (cloudUserId) {
      void deleteVehicleFromCloud(cloudUserId, vehicleId).catch(() => {});
    }
    setAttachments((prev) => prev.filter((att) => att.vehicleId !== vehicleId));
    setState((prev) => {
      const remaining = prev.vehicles.filter((v) => v.id !== vehicleId);
      const nextActive =
        prev.activeVehicleId === vehicleId ? (remaining[0]?.id ?? '') : prev.activeVehicleId;
      return {
        ...prev,
        vehicles: remaining,
        activeVehicleId: nextActive,
        items: prev.items.filter((i) => i.vehicleId !== vehicleId),
        logs: prev.logs.filter((l) => l.vehicleId !== vehicleId),
        chargingSessions: prev.chargingSessions.filter((s) => s.vehicleId !== vehicleId),
      };
    });
    setVehicleToDeleteId(null);
  };

  const requestDeleteVehicle = (vehicleId: string) => {
    setVehicleToDeleteId(vehicleId);
  };

  const handleSaveMaintenanceCheck = (payload: {
    itemId: string;
    odometerKm: number;
    cost: number;
    workshopName: string;
    notes: string;
  }) => {
    const targetItem = state.items.find((i) => i.id === payload.itemId);
    if (!targetItem || !activeVehicle) return;
    const today = todayIso();
    const localizedTitle = t.items[targetItem.titleKey]?.title ?? targetItem.titleKey;

    const newLog: ServiceLog = {
      id: `log-${Date.now()}`,
      vehicleId: activeVehicle.id,
      date: today,
      odometerKm: payload.odometerKm,
      category: targetItem.category,
      title: localizedTitle,
      cost: payload.cost,
      currency: state.prefs.currency,
      workshopName: payload.workshopName,
      notes: payload.notes,
    };

    const updatedItem: MaintenanceItem = {
      ...targetItem,
      lastCheckedDate: today,
      lastCheckedKm: payload.odometerKm,
      notes: payload.notes || targetItem.notes,
    };

    if (cloudUserId) {
      void syncMaintenanceItemToCloud(cloudUserId, updatedItem);
      void insertServiceLogToCloud(cloudUserId, newLog);
    }

    setState((prev) => {
      const updatedVehicles = prev.vehicles.map((v) =>
        v.id === activeVehicle.id
          ? { ...v, odometerKm: Math.max(v.odometerKm, payload.odometerKm) }
          : v
      );
      const changedVehicle = updatedVehicles.find((v) => v.id === activeVehicle.id);
      if (cloudUserId && changedVehicle && changedVehicle.odometerKm !== activeVehicle.odometerKm) {
        void syncVehicleToCloud(cloudUserId, changedVehicle);
      }
      return {
        ...prev,
        vehicles: updatedVehicles,
        items: prev.items.map((item) =>
          item.id === payload.itemId ? updatedItem : item
        ),
        logs: [newLog, ...prev.logs],
      };
    });

    setShowLogModal(false);
    setLogModalItem(null);
  };

  const handleAddServiceLog = async (log: ServiceLog): Promise<void> => {
    const existingVehicle = latestStateRef.current.vehicles.find((v) => v.id === log.vehicleId);
    const updatedVehicle =
      existingVehicle && log.odometerKm > existingVehicle.odometerKm
        ? { ...existingVehicle, odometerKm: log.odometerKm }
        : existingVehicle;

    setState((prev) => {
      const updatedVehicles = prev.vehicles.map((v) => {
        if (v.id !== log.vehicleId || log.odometerKm <= v.odometerKm) return v;
        return { ...v, odometerKm: log.odometerKm };
      });
      return {
        ...prev,
        vehicles: updatedVehicles,
        logs: [log, ...prev.logs],
      };
    });

    if (cloudUserId) {
      if (updatedVehicle) {
        await syncVehicleToCloud(cloudUserId, updatedVehicle).catch(() => {});
      }
      await insertServiceLogToCloud(cloudUserId, log).catch(() => {});
    }
  };

  const handleAddChargingSession = (session: ChargingSession) => {
    if (cloudUserId) void insertChargingSessionToCloud(cloudUserId, session);
    setState((prev) => ({
      ...prev,
      chargingSessions: [session, ...prev.chargingSessions],
    }));
  };

  const handleMarkMaintenanceChecked = (payload: {
    itemId: string;
    date: string;
    odometerKm: number;
    notes?: string;
  }) => {
    const target = latestStateRef.current.items.find((i) => i.id === payload.itemId);
    if (!target) return;
    const updatedItem: MaintenanceItem = {
      ...target,
      lastCheckedDate: payload.date,
      lastCheckedKm: payload.odometerKm,
      notes: payload.notes || target.notes,
    };
    if (cloudUserId) {
      void syncMaintenanceItemToCloud(cloudUserId, updatedItem);
    }
    setState((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === payload.itemId ? updatedItem : it)),
    }));
  };

  const primaryActionLabel =
    activeModule === 'garage' || !activeVehicle ? t.actions.addVehicle : t.actions.logCheck;

  const handlePrimaryAction = () => {
    if (activeModule === 'garage' || !activeVehicle) {
      setShowAddVehicleModal(true);
    } else {
      setLogModalItem(null);
      setShowLogModal(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="print:hidden">
        <SidebarNav
          activeModule={activeModule}
          onSelectModule={handleSelectModule}
          vehicles={state.vehicles}
          activeVehicleId={activeVehicle?.id ?? ''}
          onSelectVehicle={handleSelectVehicle}
          onAddVehicle={() => setShowAddVehicleModal(true)}
          onRequestDeleteVehicle={requestDeleteVehicle}
          t={t}
          units={state.prefs.units}
          theme={state.prefs.theme}
          onToggleTheme={() =>
            updatePrefs({ theme: state.prefs.theme === 'dark' ? 'light' : 'dark' })
          }
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {mapsQuotaExceeded && (
          <div
            role="alert"
            className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 border-b border-amber-600 shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Limite temporário da chave de demonstração do Google Maps atingido.{' '}
                <a
                  href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold hover:text-slate-800"
                >
                  Saiba como usar sua própria chave com crédito gratuito
                </a>
                .
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMapsQuotaExceeded(false)}
              aria-label="Fechar aviso"
              className="p-1 rounded hover:bg-amber-600/30 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="print:hidden">
          <HeaderBar
            activeModule={activeModule}
            activeVehicle={activeVehicle}
            t={t}
            language={state.prefs.language}
            currency={state.prefs.currency}
            onChangeLanguage={(lang) => updatePrefs({ language: lang })}
            onChangeCurrency={(currency) => updatePrefs({ currency })}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onPrimaryAction={handlePrimaryAction}
            primaryActionLabel={primaryActionLabel}
          />
        </div>

        {cloudUserId &&
          !dismissedWhatsappPrompt &&
          !sanitizeWhatsAppNumber(state.prefs.whatsappNumber, state.prefs.language) && (
            <div className="print:hidden px-4 sm:px-6 lg:px-8 pt-4 max-w-7xl w-full mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = onboardingWhatsappInput.trim();
                  if (!sanitizeWhatsAppNumber(clean, state.prefs.language)) {
                    setOnboardingWhatsappError(
                      'Informe um WhatsApp válido com DDD/DDI (ex.: +55 11 99999-8888).'
                    );
                    return;
                  }
                  setOnboardingWhatsappError(null);
                  updatePrefs({ whatsappNumber: clean });
                }}
                className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Complete seu cadastro único (E-mail + WhatsApp)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    E-mail já vinculado:{' '}
                    <strong className="font-mono">{cloudUserEmail || 'Conta conectada'}</strong>.{' '}
                    Salve seu WhatsApp uma única vez para enviar toda a ficha técnica e avisos com 1 clique.
                  </p>
                  {onboardingWhatsappError && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {onboardingWhatsappError}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <input
                    type="tel"
                    placeholder="Ex.: +55 11 99999-8888"
                    value={onboardingWhatsappInput}
                    onChange={(e) => setOnboardingWhatsappInput(e.target.value)}
                    className="px-3 py-1.5 text-xs sm:text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-52"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedWhatsappPrompt(true)}
                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Agora não
                  </button>
                </div>
              </form>
            </div>
          )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          {activeModule === 'health' && (
            <HealthMaintenanceView
              vehicle={activeVehicle}
              items={state.items}
              logs={state.logs}
              chargingSessions={state.chargingSessions}
              attachments={attachments}
              attachmentsLoading={attachmentsLoading}
              prefs={state.prefs}
              t={t}
              cloudUserId={cloudUserId}
              cloudUserEmail={cloudUserEmail}
              onOpenLogModal={(item) => {
                setLogModalItem(item);
                setShowLogModal(true);
              }}
              onOpenAddVehicle={() => setShowAddVehicleModal(true)}
              onUpdatePrefs={updatePrefs}
              onAttachmentCreated={(att) => setAttachments((prev) => [att, ...prev])}
              onAttachmentDeleted={(id) =>
                setAttachments((prev) => prev.filter((item) => item.id !== id))
              }
              onOpenCloudSettings={() => handleSelectModule('settings')}
            />
          )}

          {activeModule === 'garage' && (
            <GarageFleetView
              vehicles={state.vehicles}
              activeVehicle={activeVehicle}
              maintenanceItems={state.items}
              chargingSessions={state.chargingSessions}
              attachments={attachments}
              attachmentsLoading={attachmentsLoading}
              attachmentsError={attachmentsError}
              onAttachmentCreated={(att) => setAttachments((prev) => [att, ...prev])}
              onAttachmentDeleted={(id) =>
                setAttachments((prev) => prev.filter((item) => item.id !== id))
              }
              onSelectVehicle={handleSelectVehicle}
              onUpdateOdometer={handleUpdateOdometer}
              onUpdateDrivingProfile={handleUpdateDrivingProfile}
              onDeleteVehicle={requestDeleteVehicle}
              onOpenAddVehicle={() => setShowAddVehicleModal(true)}
              onUpdatePrefs={updatePrefs}
              onAddServiceLog={handleAddServiceLog}
              onAddChargingSession={handleAddChargingSession}
              onMarkMaintenanceChecked={handleMarkMaintenanceChecked}
              logs={state.logs}
              prefs={state.prefs}
              t={t}
              cloudUserId={cloudUserId}
              cloudUserEmail={cloudUserEmail}
              onOpenCloudSettings={() => handleSelectModule('settings')}
            />
          )}

          {activeModule === 'ev' && (
            <EvWorldView
              vehicle={activeVehicle}
              sessions={state.chargingSessions}
              onAddSession={handleAddChargingSession}
              prefs={state.prefs}
              t={t}
              onOpenAddVehicle={() => setShowAddVehicleModal(true)}
              onUpdatePrefs={updatePrefs}
            />
          )}

          {activeModule === 'network' && (
            <GlobalNetworkView
              vehicle={activeVehicle}
              maintenanceItems={state.items}
              prefs={state.prefs}
              t={t}
              onUpdatePrefs={updatePrefs}
            />
          )}

          {activeModule === 'settings' && (
            <InternationalSettingsView
              prefs={state.prefs}
              onUpdatePrefs={updatePrefs}
              t={t}
              vehicles={state.vehicles}
              activeVehicleId={activeVehicle?.id ?? ''}
              logs={state.logs}
              maintenanceItems={state.items}
              cloudUserId={cloudUserId}
              cloudUserEmail={cloudUserEmail}
              cloudUserName={cloudUserName}
              onSyncNow={handleSyncAllToCloud}
              onSelectVehicle={handleSelectVehicle}
              onOpenAddVehicle={() => setShowAddVehicleModal(true)}
              onRequestDeleteVehicle={requestDeleteVehicle}
            />
          )}
        </main>

        <footer className="print:hidden px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 max-w-7xl w-full mx-auto">
          <span>
            {t.brand} · {t.tagline}
          </span>
          <span>{t.health.manualReminder}</span>
        </footer>
      </div>

      <OfflineIndicator />

      {showLogModal && activeVehicle && (
        <LogCheckModal
          vehicle={activeVehicle}
          items={state.items}
          initialItem={logModalItem}
          currency={state.prefs.currency}
          t={t}
          onClose={() => {
            setShowLogModal(false);
            setLogModalItem(null);
          }}
          onSave={handleSaveMaintenanceCheck}
        />
      )}

      {showAddVehicleModal && (
        <AddVehicleModal
          t={t}
          onClose={() => setShowAddVehicleModal(false)}
          onAdd={handleAddVehicle}
        />
      )}

      {vehicleToDeleteId && (() => {
        const target = state.vehicles.find((v) => v.id === vehicleToDeleteId);
        if (!target) return null;
        return (
          <DeleteVehicleConfirmModal
            vehicle={target}
            logsCount={state.logs.filter((l) => l.vehicleId === target.id).length}
            chargesCount={state.chargingSessions.filter((c) => c.vehicleId === target.id).length}
            itemsCount={state.items.filter((i) => i.vehicleId === target.id).length}
            attachmentsCount={attachments.filter((a) => a.vehicleId === target.id).length}
            t={t}
            onClose={() => setVehicleToDeleteId(null)}
            onConfirm={() => handleDeleteVehicle(target.id)}
          />
        );
      })()}
    </div>
  );
}
