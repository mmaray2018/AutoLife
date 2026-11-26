import {
  CareGuide,
  ChargingSession,
  MaintenanceCategory,
  MaintenanceItem,
  NetworkPartner,
  PowertrainType,
  ServiceLog,
  UserPreferences,
  Vehicle,
} from '../types/autolife';

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'pt',
  units: 'metric',
  currency: 'BRL',
  theme: 'light',
  oilReminderDays: 15,
  tireReminderDays: 15,
  coolantReminderDays: 30,
  docReminderDays: 30,
  whatsappNumber: '',
};

export const INITIAL_VEHICLES: Vehicle[] = [];

export const INITIAL_MAINTENANCE_ITEMS: MaintenanceItem[] = [];

export const INITIAL_SERVICE_LOGS: ServiceLog[] = [];

export const INITIAL_CHARGING_SESSIONS: ChargingSession[] = [];

export const CARE_GUIDES: CareGuide[] = [
  {
    id: 'guide-oil',
    category: MaintenanceCategory.OIL,
    vehicleType: 'all',
    imageSrc: '/src/assets/images/guide_engine_oil_1795277502352.jpg',
    titleKey: 'oil',
    subtitleKey: 'oil',
    stepsKeys: ['0', '1', '2'],
    safetyWarningKey: 'oil',
  },
  {
    id: 'guide-coolant',
    category: MaintenanceCategory.COOLANT,
    vehicleType: 'car',
    imageSrc: '/src/assets/images/guide_coolant_check_1795277502656.jpg',
    titleKey: 'coolant',
    subtitleKey: 'coolant',
    stepsKeys: ['0', '1', '2'],
    safetyWarningKey: 'coolant',
  },
  {
    id: 'guide-tires',
    category: MaintenanceCategory.TIRES,
    vehicleType: 'car',
    imageSrc: '/src/assets/images/guide_tire_pressure_1795277501824.jpg',
    titleKey: 'tires',
    subtitleKey: 'tires',
    stepsKeys: ['0', '1', '2'],
    safetyWarningKey: 'tires',
  },
  {
    id: 'guide-moto-chain',
    category: MaintenanceCategory.CHAIN_DRIVE,
    vehicleType: 'motorcycle',
    imageSrc: '/src/assets/images/moto_chain_guide_1795519226289.jpg',
    titleKey: 'moto_chain',
    subtitleKey: 'moto_chain',
    stepsKeys: ['0', '1', '2'],
    safetyWarningKey: 'moto_chain',
  },
  {
    id: 'guide-moto-brakes',
    category: MaintenanceCategory.BRAKES,
    vehicleType: 'motorcycle',
    imageSrc: '/src/assets/images/moto_tires_brakes_1795519226444.jpg',
    titleKey: 'moto_brakes',
    subtitleKey: 'moto_brakes',
    stepsKeys: ['0', '1', '2'],
    safetyWarningKey: 'moto_brakes',
  },
];

export const NETWORK_PARTNERS: NetworkPartner[] = [];

export const EV_HERO_IMAGE = '/src/assets/images/guide_ev_charging_1795277503840.jpg';
