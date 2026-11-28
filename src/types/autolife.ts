export enum PowertrainType {
  GASOLINE = 'gasoline',
  DIESEL = 'diesel',
  HYBRID = 'hybrid',
  ELECTRIC = 'electric',
}

export enum MaintenanceStatus {
  PENDING = 'pending',
  ON_TRACK = 'on_track',
  ATTENTION = 'attention',
  OVERDUE = 'overdue',
}

export enum MaintenanceCategory {
  OIL = 'oil',
  COOLANT = 'coolant',
  TIRES = 'tires',
  BATTERY = 'battery',
  BRAKES = 'brakes',
  DOCUMENTATION = 'documentation',
  REVISION = 'revision',
  TIMING_BELT = 'timing_belt',
  CHAIN_DRIVE = 'chain_drive',
  SUSPENSION = 'suspension',
  FUEL = 'fuel',
  EXPENSE = 'expense',
}

export type VehicleType = 'car' | 'motorcycle';
export type LanguageCode = 'pt' | 'en' | 'es' | 'de' | 'fr';
export type UnitSystem = 'metric' | 'imperial';
export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'CHF' | 'MXN' | 'JPY';
export type ModuleId = 'health' | 'garage' | 'ev' | 'network' | 'settings' | 'admin';
export type DrivingProfile = 'urban_severe' | 'mixed' | 'highway';
export type CanonicalPlanId =
  | 'personal'
  | 'fleet_10'
  | 'fleet_25'
  | 'fleet_50'
  | 'fleet_100'
  | 'enterprise';
export type PlanTier = CanonicalPlanId | 'free' | 'plus' | 'fleet';
export type AccountScope = 'personal' | 'business';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'canceled'
  | 'expired';
export type BillingCycle = 'monthly' | 'annual';
export type PaymentMethodType = 'card' | 'pix' | 'sepa_debit' | 'apple_google_pay';
export type CountryCode =
  | 'BR'
  | 'US'
  | 'PT'
  | 'ES'
  | 'DE'
  | 'FR'
  | 'GB'
  | 'CA'
  | 'CH'
  | 'MX'
  | 'JP'
  | 'EU'
  | 'GLOBAL';

export interface Vehicle {
  id: string;
  vehicleType?: VehicleType;
  make: string;
  model: string;
  year: number;
  plate: string;
  color?: string;
  vinOrRenavam?: string;
  powertrain: PowertrainType;
  engineDisplacementCc?: number;
  odometerKm: number;
  fleetGroup: 'personal' | 'fleet';
  drivingProfile?: DrivingProfile;
  weeklyKm?: number;
  batteryCapacityKwh?: number;
  consumptionKwhPer100Km?: number;
  estimatedRangeKm?: number;
  batterySohPercent?: number;
  tirePressurePsi: number;
  rearTirePressurePsi?: number;
  documentExpiryDate: string; // YYYY-MM-DD
  insuranceExpiryDate: string; // YYYY-MM-DD
  manualSpec?: VehicleManualSpec;
  organizationId?: string;
  assignedMemberName?: string;
  assignedMemberEmail?: string;
}

export interface ParsedVehicleDocument {
  vehicleCategory: VehicleType;
  brand: string;
  model: string;
  year: number | null;
  color: string;
  licensePlate: string;
  fuelType: string;
  engineDisplacement: string;
  licensingDueDate: string;
  vinOrRenavam: string;
}

export interface ManualSourceLink {
  title: string;
  url: string;
}

export interface VehicleManualSpec {
  vehicleSummary: string;
  officialPortalName: string;
  oilSpec: string;
  oilCapacityLiters?: string;
  oilIntervalKm?: number;
  oilIntervalDays?: number;
  frontTirePsi?: number;
  rearTirePsi?: number;
  tirePressureNote?: string;
  coolantSpec?: string;
  brakeFluidSpec?: string;
  batterySpec?: string;
  chainOrBeltSpec?: string;
  revisionIntervalKm?: number;
  fuelOrChargingSpec?: string;
  safetyReminder: string;
  sources: ManualSourceLink[];
  fetchedAt: string;
}

export interface QuoteAuditItem {
  itemName: string;
  assessment: 'necessary' | 'questionable' | 'recently_serviced';
  reason: string;
}

export interface QuoteAuditResult {
  overallVerdict: 'fair' | 'review_items' | 'overpriced_or_duplicate';
  verdictLabel: string;
  summary: string;
  itemizedAnalysis: QuoteAuditItem[];
  questionsForMechanic: string[];
}

export interface DtcDecodeResult {
  code: string;
  system: string;
  severity: 'low' | 'medium' | 'high';
  severityLabel: string;
  plainExplanation: string;
  commonCauses: string[];
  safeToDrive: string;
  firstSteps: string[];
}

export interface MaintenanceItem {
  id: string;
  vehicleId: string;
  category: MaintenanceCategory;
  titleKey: string;
  descriptionKey: string;
  intervalDays: number;
  intervalKm: number;
  lastCheckedDate: string; // YYYY-MM-DD
  lastCheckedKm: number;
  notes?: string;
  safetyNoteKey?: string;
}

export interface ServiceLog {
  id: string;
  vehicleId: string;
  date: string;
  odometerKm: number;
  category: MaintenanceCategory;
  title: string;
  cost: number;
  currency?: CurrencyCode;
  workshopName: string;
  notes: string;
}

export interface ChargingSession {
  id: string;
  vehicleId: string;
  date: string;
  stationName: string;
  powerType: 'AC' | 'DC';
  energyKwh: number;
  cost: number;
  currency?: CurrencyCode;
  socStart: number;
  socEnd: number;
}

export interface NetworkPartner {
  id: string;
  name: string;
  category: 'workshop' | 'ev_charger' | 'tires' | 'fuel' | 'dealership';
  city: string;
  country: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  rating: number;
  openNow: boolean;
  supportedPowertrains: PowertrainType[];
  supportedVehicleTypes?: VehicleType[];
  specialties: string[];
  connectorInfo?: string;
}

export interface MechanicDiagnosis {
  summary: string;
  urgency: 'safe' | 'attention' | 'urgent';
  urgencyLabel: string;
  possibleCauses: string[];
  safeChecks: string[];
  whenToVisitWorkshop: string;
}

export interface MechanicMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  diagnosis?: MechanicDiagnosis;
  error?: string;
}

export interface CareGuide {
  id: string;
  category: MaintenanceCategory;
  vehicleType?: VehicleType | 'all';
  imageSrc: string;
  titleKey: string;
  subtitleKey: string;
  stepsKeys: string[];
  safetyWarningKey: string;
}

export interface UserPreferences {
  language: LanguageCode;
  units: UnitSystem;
  currency: CurrencyCode;
  countryCode?: CountryCode;
  theme: 'light' | 'dark';
  oilReminderDays: number;
  tireReminderDays: number;
  coolantReminderDays: number;
  docReminderDays: number;
  activePlan?: PlanTier;
  whatsappNumber?: string;
}

export interface PlanCountryPrice {
  planId: CanonicalPlanId;
  countryCode: string;
  currencyCode: CurrencyCode;
  monthlyPriceMinor: number;
  annualPriceMinor: number;
  taxRatePercent: number;
  taxLabel: string;
  processingFeePercent: number;
  processingFeeFixedMinor: number;
}

export interface SubscriptionPlanCatalogItem {
  id: CanonicalPlanId;
  slug: string;
  accountScope: AccountScope;
  name: string;
  description: string;
  vehicleLimit: number | null;
  allowFleetPanel: boolean;
  allowTeamMembers: boolean;
  maxTeamMembers: number | null;
  features: string[];
  sortOrder: number;
  price: PlanCountryPrice;
}

export interface UserSubscriptionRecord {
  id: string;
  userId: string;
  planId: CanonicalPlanId;
  countryCode: string;
  currencyCode: CurrencyCode;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  autoRenew: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodEnd?: string | null;
  canceledAt?: string | null;
  provider: string;
  updatedAt: string;
}

export interface SubscriptionPaymentRecord {
  id: string;
  planId: CanonicalPlanId;
  amountMinor: number;
  taxMinor: number;
  processingFeeMinor: number;
  currencyCode: CurrencyCode;
  countryCode: string;
  paymentMethod: string;
  provider: string;
  providerPaymentId?: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paidAt: string;
}

export interface OrganizationPermissions {
  canViewVehicles: boolean;
  canEditVehicles: boolean;
  canLogMaintenance: boolean;
  canViewExpenses: boolean;
  canManageTeam: boolean;
}

export type OrganizationMemberRole = 'admin' | 'fleet_manager' | 'driver' | 'viewer';

export interface OrganizationProfile {
  id: string;
  ownerUserId: string;
  name: string;
  taxId: string;
  countryCode: string;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId?: string | null;
  memberEmail: string;
  memberName: string;
  role: OrganizationMemberRole;
  permissions: OrganizationPermissions;
  inviteStatus: 'pending' | 'active' | 'revoked';
  inviteToken: string;
  createdAt: string;
}

export interface OdometerEvent {
  id: string;
  vehicleId: string;
  odometerKm: number;
  source: 'initial' | 'manual' | 'service_log' | 'inspection';
  recordedAt: string;
}

export interface PassportSnapshotPayload {
  vehicle: {
    make: string;
    model: string;
    year: number;
    plate: string;
    color?: string;
    vehicleType: VehicleType;
    engineDisplacementCc?: number;
    powertrain: PowertrainType;
    odometerKm: number;
    documentExpiryDate?: string;
    insuranceExpiryDate?: string;
  };
  compliance: {
    onTrack: number;
    attention: number;
    overdue: number;
    total: number;
  };
  odometerHistory: Array<{
    odometerKm: number;
    recordedAt: string;
    source: string;
  }>;
  serviceHistory: Array<{
    date: string;
    title: string;
    odometerKm: number;
    workshopName: string;
    cost?: number;
    currency?: CurrencyCode;
  }>;
  documentsSummary?: Array<{
    fileCategory: AttachmentCategory;
    fileName: string;
    attachmentDate: string;
  }>;
  generatedAt: string;
}

export interface VehiclePassportShare {
  id: string;
  vehicleId: string;
  shareToken: string;
  isActive: boolean;
  includeExpenses: boolean;
  includeDocuments: boolean;
  passportSnapshot: PassportSnapshotPayload;
  expiresAt?: string | null;
  createdAt: string;
}

export type AttachmentCategory =
  | 'vehicle_photo'
  | 'document'
  | 'insurance'
  | 'receipt'
  | 'inspection'
  | 'diagnostic';

export interface VehicleAttachment {
  id: string;
  vehicleId: string;
  serviceLogId?: string;
  fileCategory: AttachmentCategory;
  attachmentDate: string; // YYYY-MM-DD
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageBucket: string;
  storagePath: string;
  notes?: string;
  createdAt: string;
  signedUrl?: string;
}
