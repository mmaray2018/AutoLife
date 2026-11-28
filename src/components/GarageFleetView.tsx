import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bike,
  Building2,
  CalendarPlus,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Gauge,
  Lock,
  Pencil,
  Plus,
  QrCode,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import { getUi } from '../data/uiTranslations';
import {
  ChargingSession,
  DrivingProfile,
  LanguageCode,
  MaintenanceItem,
  MaintenanceStatus,
  OdometerEvent,
  OrganizationMember,
  OrganizationProfile,
  ServiceLog,
  SubscriptionPaymentRecord,
  SubscriptionPlanCatalogItem,
  UserPreferences,
  UserSubscriptionRecord,
  Vehicle,
  VehicleAttachment,
} from '../types/autolife';
import {
  computeMaintenanceStatus,
  daysBetween,
  downloadCsv,
  formatCurrency,
  formatDistance,
  isDateRecorded,
  todayIso,
} from '../utils/autolife';
import {
  CURRENCY_CATALOG,
  convertCurrency,
  isBusinessPlan,
  localizePlanCatalog,
  normalizePlanTier,
} from '../utils/billing';
import { downloadCalendarEvent } from '../utils/calendar';
import { downloadPdfBlob, generateFleetSummaryPdf } from '../utils/pdfReport';
import {
  buildServiceLogWhatsAppText,
  buildVehicleWhatsAppText,
} from '../utils/whatsapp';
import {
  VEHICLE_COLOR_SWATCHES,
  getLocalizedColorLabel,
  resolveVehicleColorStyle,
} from '../utils/vehicleVisualResolver';
import { CarbonFootprintSection } from './CarbonFootprintSection';
import { FleetAnalyticsSection } from './FleetAnalyticsSection';
import { FleetTeamSection } from './FleetTeamSection';
import { SubscriptionPlansSection } from './SubscriptionPlansSection';
import { VehicleMedicalRecordPanel } from './VehicleMedicalRecordPanel';
import { VehiclePassportModal } from './VehiclePassportModal';
import { VehicleVaultSection } from './VehicleVaultSection';
import { VehicleVisual } from './VehicleVisual';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface GarageFleetViewProps {
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  maintenanceItems: MaintenanceItem[];
  chargingSessions: ChargingSession[];
  attachments: VehicleAttachment[];
  attachmentsLoading: boolean;
  attachmentsError: string | null;
  catalogPlans: SubscriptionPlanCatalogItem[];
  catalogSource: 'database' | 'fallback';
  subscription: UserSubscriptionRecord | null;
  payments: SubscriptionPaymentRecord[];
  organization: OrganizationProfile | null;
  orgMembers: OrganizationMember[];
  odometerEvents: OdometerEvent[];
  focusPlansSignal?: number;
  onAttachmentCreated: (attachment: VehicleAttachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
  onSelectVehicle: (id: string) => void;
  onUpdateOdometer: (vehicleId: string, newKm: number) => void;
  onUpdateDrivingProfile: (
    vehicleId: string,
    drivingProfile: DrivingProfile,
    weeklyKm: number
  ) => void;
  onAssignVehicleMember: (vehicleId: string, memberName: string, memberEmail: string) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onOpenAddVehicle: () => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
  onUpdateVehicle?: (vehicle: Vehicle) => void;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
  onAddServiceLog: (log: ServiceLog) => Promise<void> | void;
  onAddChargingSession: (session: ChargingSession) => void;
  onMarkMaintenanceChecked?: (payload: {
    itemId: string;
    date: string;
    odometerKm: number;
    notes?: string;
  }) => void;
  onOrganizationUpdated: (org: OrganizationProfile) => void;
  onMembersChanged: (members: OrganizationMember[]) => void;
  onSubscriptionUpdated: (sub: UserSubscriptionRecord | null) => void;
  onRefreshSubscription: () => Promise<void>;
  logs: ServiceLog[];
  prefs: UserPreferences;
  t: Translations;
  cloudUserId: string | null;
  cloudUserEmail?: string | null;
  onOpenCloudSettings: () => void;
}

const GARAGE_EXTRA_COPY: Record<
  LanguageCode,
  {
    accountOwner: string;
    ownerRole: string;
    signInBtn: string;
    csvHeaders: [string, string, string, string, string, string];
    csvFilename: string;
    fleetDefaultName: string;
    fleetHeaderTitle: string;
    companyFallback: string;
    activeVehiclesLabel: string;
    personalPlanFallback: string;
    sendVehicleWaTitle: string;
    fleetModeBtn: string;
    selectVehicleAria: string;
    gateBadge: string;
    viewFleetPlansBtn: string;
    backToPersonalBtn: string;
    multiVehiclesTitle: string;
    multiVehiclesDesc: string;
    teamPermTitle: string;
    teamPermDesc: string;
    limitReachedTitle: string;
    limitReachedDesc: string;
    expandFleetBtn: string;
    kpiFleetVehicles: string;
    unlimited: string;
    kpiTotalOdo: string;
    kpiOverdue: string;
    vehicleUnitSuffix: string;
    kpiUpcoming: string;
    revShort: string;
    docShort: string;
    insShort: string;
    kpiMonthlySpend: string;
    fleetPdfBtn: string;
    colPlateType: string;
    colMonthlySpend: string;
    colExpiries: string;
    overdueSuffix: string;
    attentionSuffix: string;
    qrShort: string;
    ficheShort: string;
    removeVehicleAria: string;
    setColorAria: string;
    drivingProfileLabel: string;
    profileUrban: string;
    profileMixed: string;
    profileHighway: string;
    weeklyAvgLabel: string;
    vehiclesInPlanSuffix: string;
    removeVehicleAndHistory: string;
    sendDocWaTitle: string;
    sendInsWaTitle: string;
    waDocHeader: string;
    waInsHeader: string;
    waVehicleLabel: string;
    waExpiresOn: string;
    addCalTitle: string;
    addCalAria: string;
    calDocPrefix: string;
    calInsPrefix: string;
    accumulatedTco: string;
    costPerKm: string;
    ledgerDate: string;
    ledgerVehicle: string;
    ledgerService: string;
    ledgerWorkshop: string;
    ledgerOdometer: string;
    ledgerAmount: string;
    sendBtn: string;
  }
> = {
  pt: {
    accountOwner: 'Administrador da Conta',
    ownerRole: 'Proprietário',
    signInBtn: 'Entrar com Google / Conta',
    csvHeaders: ['Data', 'Veículo', 'Categoria', 'Serviço', 'Odômetro (km)', 'Oficina'],
    csvFilename: 'autolife-historico-servicos.csv',
    fleetDefaultName: 'Frota Empresarial',
    fleetHeaderTitle: 'Gestão Empresarial de Frotas',
    companyFallback: 'Empresa',
    activeVehiclesLabel: 'veículo(s) sob gestão ativa',
    personalPlanFallback: 'Plano Particular',
    sendVehicleWaTitle: 'Enviar resumo do veículo para o WhatsApp cadastrado',
    fleetModeBtn: 'Frota Empresarial',
    selectVehicleAria: 'Selecionar veículo',
    gateBadge: 'Área Exclusiva para Empresas · Plano Frotas',
    viewFleetPlansBtn: 'Ver Planos Frotas',
    backToPersonalBtn: 'Voltar para Modo Particular',
    multiVehiclesTitle: 'Multiveículos (10 a 100+)',
    multiVehiclesDesc: 'Carros e motocicletas unificados',
    teamPermTitle: 'Equipe & Permissões',
    teamPermDesc: 'Motoristas, gestores e isolamento por empresa',
    limitReachedTitle: 'Limite do plano atingido',
    limitReachedDesc: 'Para cadastrar novos veículos sem interromper sua operação, expanda sua frota.',
    expandFleetBtn: 'Expandir Frota',
    kpiFleetVehicles: 'Veículos na Frota',
    unlimited: '(ilimitado)',
    kpiTotalOdo: 'Odômetro Total',
    kpiOverdue: 'Manutenções Atrasadas',
    vehicleUnitSuffix: 'veículo(s)',
    kpiUpcoming: 'Revisões / Docs Próximos',
    revShort: 'rev',
    docShort: 'Doc',
    insShort: 'Seg',
    kpiMonthlySpend: 'Gastos no Mês Atual',
    fleetPdfBtn: 'Relatório Geral (PDF)',
    colPlateType: 'Placa / Tipo',
    colMonthlySpend: 'Gastos Mês',
    colExpiries: 'Vencimentos',
    overdueSuffix: 'atrasado(s)',
    attentionSuffix: 'revisão(ões) próxima(s)',
    qrShort: 'QR',
    ficheShort: 'Ficha',
    removeVehicleAria: 'Remover veículo',
    setColorAria: 'Definir cor',
    drivingProfileLabel: 'Perfil de Severidade de Uso',
    profileUrban: 'Urbano Severo (trânsito intenso)',
    profileMixed: 'Misto (cidade + estrada)',
    profileHighway: 'Rodoviário (viagens longas)',
    weeklyAvgLabel: 'Média semanal (km/sem)',
    vehiclesInPlanSuffix: 'veículo(s) no plano',
    removeVehicleAndHistory: 'Remover veículo e histórico',
    sendDocWaTitle: 'Enviar vencimento no WhatsApp cadastrado',
    sendInsWaTitle: 'Enviar vencimento do seguro no WhatsApp cadastrado',
    waDocHeader: '*AutoLife World — Documento*',
    waInsHeader: '*AutoLife World — Seguro*',
    waVehicleLabel: 'Veículo',
    waExpiresOn: 'vence em',
    addCalTitle: 'Adicionar ao Calendário (.ics)',
    addCalAria: 'Adicionar vencimento ao Calendário',
    calDocPrefix: 'documento',
    calInsPrefix: 'seguro',
    accumulatedTco: 'TCO acumulado:',
    costPerKm: 'Custo por km:',
    ledgerDate: 'Data',
    ledgerVehicle: 'Veículo',
    ledgerService: 'Serviço',
    ledgerWorkshop: 'Oficina / Local',
    ledgerOdometer: 'Odômetro',
    ledgerAmount: 'Valor',
    sendBtn: 'Enviar',
  },
  en: {
    accountOwner: 'Account Owner',
    ownerRole: 'Owner',
    signInBtn: 'Sign in with Google / Account',
    csvHeaders: ['Date', 'Vehicle', 'Category', 'Service', 'Odometer (km)', 'Workshop'],
    csvFilename: 'autolife-service-history.csv',
    fleetDefaultName: 'Business Fleet',
    fleetHeaderTitle: 'Business Fleet Management',
    companyFallback: 'Company',
    activeVehiclesLabel: 'vehicle(s) under active management',
    personalPlanFallback: 'Personal Plan',
    sendVehicleWaTitle: 'Send vehicle summary to saved WhatsApp',
    fleetModeBtn: 'Business Fleet',
    selectVehicleAria: 'Select vehicle',
    gateBadge: 'Business Exclusive · Fleet Plans',
    viewFleetPlansBtn: 'View Fleet Plans',
    backToPersonalBtn: 'Back to Personal Mode',
    multiVehiclesTitle: 'Multi-Vehicle (10 to 100+)',
    multiVehiclesDesc: 'Cars and motorcycles unified',
    teamPermTitle: 'Team & Permissions',
    teamPermDesc: 'Drivers, managers, and tenant isolation',
    limitReachedTitle: 'Plan limit reached',
    limitReachedDesc: 'To register more vehicles without interrupting operations, expand your fleet plan.',
    expandFleetBtn: 'Expand Fleet',
    kpiFleetVehicles: 'Fleet Vehicles',
    unlimited: '(unlimited)',
    kpiTotalOdo: 'Total Odometer',
    kpiOverdue: 'Overdue Maintenance',
    vehicleUnitSuffix: 'vehicle(s)',
    kpiUpcoming: 'Upcoming Services / Docs',
    revShort: 'svc',
    docShort: 'Doc',
    insShort: 'Ins',
    kpiMonthlySpend: 'Current Month Spend',
    fleetPdfBtn: 'Fleet Report (PDF)',
    colPlateType: 'Plate / Type',
    colMonthlySpend: 'Month Spend',
    colExpiries: 'Expiries',
    overdueSuffix: 'overdue',
    attentionSuffix: 'due soon',
    qrShort: 'QR',
    ficheShort: 'Record',
    removeVehicleAria: 'Remove vehicle',
    setColorAria: 'Set color',
    drivingProfileLabel: 'Driving Severity Profile',
    profileUrban: 'Severe Urban (heavy traffic)',
    profileMixed: 'Mixed (city + highway)',
    profileHighway: 'Highway (long trips)',
    weeklyAvgLabel: 'Weekly average (km/wk)',
    vehiclesInPlanSuffix: 'vehicle(s) in plan',
    removeVehicleAndHistory: 'Remove vehicle & history',
    sendDocWaTitle: 'Send document expiry to saved WhatsApp',
    sendInsWaTitle: 'Send insurance expiry to saved WhatsApp',
    waDocHeader: '*AutoLife World — Document*',
    waInsHeader: '*AutoLife World — Insurance*',
    waVehicleLabel: 'Vehicle',
    waExpiresOn: 'expires on',
    addCalTitle: 'Add to Calendar (.ics)',
    addCalAria: 'Add expiry to Calendar',
    calDocPrefix: 'document',
    calInsPrefix: 'insurance',
    accumulatedTco: 'Accumulated TCO:',
    costPerKm: 'Cost per km:',
    ledgerDate: 'Date',
    ledgerVehicle: 'Vehicle',
    ledgerService: 'Service',
    ledgerWorkshop: 'Workshop / Place',
    ledgerOdometer: 'Odometer',
    ledgerAmount: 'Amount',
    sendBtn: 'Send',
  },
  es: {
    accountOwner: 'Administrador de la Cuenta',
    ownerRole: 'Propietario',
    signInBtn: 'Entrar con Google / Cuenta',
    csvHeaders: ['Fecha', 'Vehículo', 'Categoría', 'Servicio', 'Odómetro (km)', 'Taller'],
    csvFilename: 'autolife-historial-servicios.csv',
    fleetDefaultName: 'Flota Empresarial',
    fleetHeaderTitle: 'Gestión Empresarial de Flotas',
    companyFallback: 'Empresa',
    activeVehiclesLabel: 'vehículo(s) bajo gestión activa',
    personalPlanFallback: 'Plan Particular',
    sendVehicleWaTitle: 'Enviar resumen del vehículo al WhatsApp guardado',
    fleetModeBtn: 'Flota Empresarial',
    selectVehicleAria: 'Seleccionar vehículo',
    gateBadge: 'Área Exclusiva para Empresas · Plan Flotas',
    viewFleetPlansBtn: 'Ver Planes de Flota',
    backToPersonalBtn: 'Volver al Modo Particular',
    multiVehiclesTitle: 'Multivehículos (10 a 100+)',
    multiVehiclesDesc: 'Coches y motocicletas unificados',
    teamPermTitle: 'Equipo y Permisos',
    teamPermDesc: 'Conductores, gestores y aislamiento por empresa',
    limitReachedTitle: 'Límite del plan alcanzado',
    limitReachedDesc: 'Para registrar nuevos vehículos sin interrumpir tu operación, amplía tu flota.',
    expandFleetBtn: 'Ampliar Flota',
    kpiFleetVehicles: 'Vehículos en Flota',
    unlimited: '(ilimitado)',
    kpiTotalOdo: 'Odómetro Total',
    kpiOverdue: 'Mantenimientos Vencidos',
    vehicleUnitSuffix: 'vehículo(s)',
    kpiUpcoming: 'Revisiones / Docs Próximos',
    revShort: 'rev',
    docShort: 'Doc',
    insShort: 'Seg',
    kpiMonthlySpend: 'Gasto del Mes Actual',
    fleetPdfBtn: 'Informe General (PDF)',
    colPlateType: 'Matrícula / Tipo',
    colMonthlySpend: 'Gasto Mes',
    colExpiries: 'Vencimientos',
    overdueSuffix: 'vencido(s)',
    attentionSuffix: 'revisión(es) próxima(s)',
    qrShort: 'QR',
    ficheShort: 'Ficha',
    removeVehicleAria: 'Eliminar vehículo',
    setColorAria: 'Establecer color',
    drivingProfileLabel: 'Perfil de Severidad de Uso',
    profileUrban: 'Urbano Severo (tráfico intenso)',
    profileMixed: 'Mixto (ciudad + carretera)',
    profileHighway: 'Carretera (viajes largos)',
    weeklyAvgLabel: 'Media semanal (km/sem)',
    vehiclesInPlanSuffix: 'vehículo(s) en el plan',
    removeVehicleAndHistory: 'Eliminar vehículo e historial',
    sendDocWaTitle: 'Enviar vencimiento al WhatsApp guardado',
    sendInsWaTitle: 'Enviar vencimiento del seguro al WhatsApp guardado',
    waDocHeader: '*AutoLife World — Documento*',
    waInsHeader: '*AutoLife World — Seguro*',
    waVehicleLabel: 'Vehículo',
    waExpiresOn: 'vence el',
    addCalTitle: 'Añadir al Calendario (.ics)',
    addCalAria: 'Añadir vencimiento al Calendario',
    calDocPrefix: 'documento',
    calInsPrefix: 'seguro',
    accumulatedTco: 'TCO acumulado:',
    costPerKm: 'Costo por km:',
    ledgerDate: 'Fecha',
    ledgerVehicle: 'Vehículo',
    ledgerService: 'Servicio',
    ledgerWorkshop: 'Taller / Lugar',
    ledgerOdometer: 'Odómetro',
    ledgerAmount: 'Importe',
    sendBtn: 'Enviar',
  },
  de: {
    accountOwner: 'Kontoadministrator',
    ownerRole: 'Inhaber',
    signInBtn: 'Mit Google / Konto anmelden',
    csvHeaders: ['Datum', 'Fahrzeug', 'Kategorie', 'Service', 'Kilometerstand (km)', 'Werkstatt'],
    csvFilename: 'autolife-serviceverlauf.csv',
    fleetDefaultName: 'Unternehmensflotte',
    fleetHeaderTitle: 'Gewerbliches Flottenmanagement',
    companyFallback: 'Unternehmen',
    activeVehiclesLabel: 'Fahrzeug(e) aktiv verwaltet',
    personalPlanFallback: 'Privattarif',
    sendVehicleWaTitle: 'Fahrzeugübersicht an gespeichertes WhatsApp senden',
    fleetModeBtn: 'Gewerbeflotte',
    selectVehicleAria: 'Fahrzeug auswählen',
    gateBadge: 'Exklusiv für Unternehmen · Flottentarife',
    viewFleetPlansBtn: 'Flottentarife ansehen',
    backToPersonalBtn: 'Zurück zum Privatmodus',
    multiVehiclesTitle: 'Mehrfahrzeuge (10 bis 100+)',
    multiVehiclesDesc: 'PKW und Motorräder vereint',
    teamPermTitle: 'Team & Berechtigungen',
    teamPermDesc: 'Fahrer, Manager und Mandantentrennung',
    limitReachedTitle: 'Tariflimit erreicht',
    limitReachedDesc: 'Erweitern Sie Ihren Flottentarif, um weitere Fahrzeuge hinzuzufügen.',
    expandFleetBtn: 'Flotte erweitern',
    kpiFleetVehicles: 'Flottenfahrzeuge',
    unlimited: '(unbegrenzt)',
    kpiTotalOdo: 'Gesamtkilometer',
    kpiOverdue: 'Überfällige Wartungen',
    vehicleUnitSuffix: 'Fahrzeug(e)',
    kpiUpcoming: 'Anstehende Services / Dok.',
    revShort: 'Svc',
    docShort: 'Dok',
    insShort: 'Vers',
    kpiMonthlySpend: 'Ausgaben aktueller Monat',
    fleetPdfBtn: 'Flottenbericht (PDF)',
    colPlateType: 'Kennzeichen / Typ',
    colMonthlySpend: 'Monatskosten',
    colExpiries: 'Fristen',
    overdueSuffix: 'überfällig',
    attentionSuffix: 'bald fällig',
    qrShort: 'QR',
    ficheShort: 'Akte',
    removeVehicleAria: 'Fahrzeug entfernen',
    setColorAria: 'Farbe festlegen',
    drivingProfileLabel: 'Nutzungs- und Belastungsprofil',
    profileUrban: 'Starker Stadtverkehr',
    profileMixed: 'Gemischt (Stadt + Autobahn)',
    profileHighway: 'Langstrecke / Autobahn',
    weeklyAvgLabel: 'Wochendurchschnitt (km/W)',
    vehiclesInPlanSuffix: 'Fahrzeug(e) im Tarif',
    removeVehicleAndHistory: 'Fahrzeug & Verlauf löschen',
    sendDocWaTitle: 'Dokumentfrist an gespeichertes WhatsApp senden',
    sendInsWaTitle: 'Versicherungsfrist an gespeichertes WhatsApp senden',
    waDocHeader: '*AutoLife World — Dokument*',
    waInsHeader: '*AutoLife World — Versicherung*',
    waVehicleLabel: 'Fahrzeug',
    waExpiresOn: 'läuft ab am',
    addCalTitle: 'Zum Kalender hinzufügen (.ics)',
    addCalAria: 'Frist zum Kalender hinzufügen',
    calDocPrefix: 'dokument',
    calInsPrefix: 'versicherung',
    accumulatedTco: 'Gesamte TCO:',
    costPerKm: 'Kosten pro km:',
    ledgerDate: 'Datum',
    ledgerVehicle: 'Fahrzeug',
    ledgerService: 'Service',
    ledgerWorkshop: 'Werkstatt / Ort',
    ledgerOdometer: 'Kilometerstand',
    ledgerAmount: 'Betrag',
    sendBtn: 'Senden',
  },
  fr: {
    accountOwner: 'Administrateur du Compte',
    ownerRole: 'Propriétaire',
    signInBtn: 'Se connecter avec Google / Compte',
    csvHeaders: ['Date', 'Véhicule', 'Catégorie', 'Service', 'Kilométrage (km)', 'Garage'],
    csvFilename: 'autolife-historique-services.csv',
    fleetDefaultName: 'Flotte Entreprise',
    fleetHeaderTitle: 'Gestion de Flotte Entreprise',
    companyFallback: 'Entreprise',
    activeVehiclesLabel: 'véhicule(s) sous gestion active',
    personalPlanFallback: 'Offre Particulier',
    sendVehicleWaTitle: 'Envoyer le résumé du véhicule sur WhatsApp enregistré',
    fleetModeBtn: 'Flotte Entreprise',
    selectVehicleAria: 'Sélectionner le véhicule',
    gateBadge: 'Espace Entreprises · Offres Flotte',
    viewFleetPlansBtn: 'Voir les Offres Flotte',
    backToPersonalBtn: 'Revenir au Mode Particulier',
    multiVehiclesTitle: 'Multi-véhicules (10 à 100+)',
    multiVehiclesDesc: 'Voitures et motos unifiées',
    teamPermTitle: 'Équipe & Permissions',
    teamPermDesc: 'Conducteurs, gestionnaires et isolation multi-entreprise',
    limitReachedTitle: 'Limite de l’offre atteinte',
    limitReachedDesc: 'Étendez votre offre flotte pour ajouter davantage de véhicules.',
    expandFleetBtn: 'Étendre la Flotte',
    kpiFleetVehicles: 'Véhicules en Flotte',
    unlimited: '(illimité)',
    kpiTotalOdo: 'Kilométrage Total',
    kpiOverdue: 'Entretiens en Retard',
    vehicleUnitSuffix: 'véhicule(s)',
    kpiUpcoming: 'Révisions / Docs Proches',
    revShort: 'rév',
    docShort: 'Doc',
    insShort: 'Ass',
    kpiMonthlySpend: 'Dépenses du Mois',
    fleetPdfBtn: 'Rapport Général (PDF)',
    colPlateType: 'Immatriculation / Type',
    colMonthlySpend: 'Dépenses Mois',
    colExpiries: 'Échéances',
    overdueSuffix: 'en retard',
    attentionSuffix: 'bientôt dû(s)',
    qrShort: 'QR',
    ficheShort: 'Fiche',
    removeVehicleAria: 'Supprimer le véhicule',
    setColorAria: 'Définir la couleur',
    drivingProfileLabel: 'Profil de Sévérité d’Usage',
    profileUrban: 'Urbain Sévère (trafic dense)',
    profileMixed: 'Mixte (ville + route)',
    profileHighway: 'Autoroute (longs trajets)',
    weeklyAvgLabel: 'Moyenne hebdomadaire (km/sem)',
    vehiclesInPlanSuffix: 'véhicule(s) dans l’offre',
    removeVehicleAndHistory: 'Supprimer véhicule et historique',
    sendDocWaTitle: 'Envoyer l’échéance sur WhatsApp enregistré',
    sendInsWaTitle: 'Envoyer l’échéance d’assurance sur WhatsApp enregistré',
    waDocHeader: '*AutoLife World — Document*',
    waInsHeader: '*AutoLife World — Assurance*',
    waVehicleLabel: 'Véhicule',
    waExpiresOn: 'expire le',
    addCalTitle: 'Ajouter au Calendrier (.ics)',
    addCalAria: 'Ajouter l’échéance au Calendrier',
    calDocPrefix: 'document',
    calInsPrefix: 'assurance',
    accumulatedTco: 'TCO cumulé :',
    costPerKm: 'Coût par km :',
    ledgerDate: 'Date',
    ledgerVehicle: 'Véhicule',
    ledgerService: 'Service',
    ledgerWorkshop: 'Garage / Lieu',
    ledgerOdometer: 'Kilométrage',
    ledgerAmount: 'Montant',
    sendBtn: 'Envoyer',
  },
};

export function GarageFleetView({
  vehicles,
  activeVehicle,
  maintenanceItems,
  chargingSessions,
  attachments,
  attachmentsLoading,
  attachmentsError,
  catalogPlans,
  catalogSource,
  subscription,
  payments,
  organization,
  orgMembers,
  odometerEvents,
  focusPlansSignal = 0,
  onAttachmentCreated,
  onAttachmentDeleted,
  onSelectVehicle,
  onUpdateOdometer,
  onUpdateDrivingProfile,
  onAssignVehicleMember,
  onDeleteVehicle,
  onOpenAddVehicle,
  onEditVehicle,
  onUpdateVehicle,
  onUpdatePrefs,
  onAddServiceLog,
  onAddChargingSession,
  onMarkMaintenanceChecked,
  onOrganizationUpdated,
  onMembersChanged,
  onSubscriptionUpdated,
  onRefreshSubscription,
  logs,
  prefs,
  t,
  cloudUserId,
  cloudUserEmail,
  onOpenCloudSettings,
}: GarageFleetViewProps) {
  const ui = getUi(prefs.language);
  const gCopy = GARAGE_EXTRA_COPY[prefs.language] ?? GARAGE_EXTRA_COPY.en;
  const localizedCatalogPlans = useMemo(
    () => localizePlanCatalog(catalogPlans, prefs.language),
    [catalogPlans, prefs.language]
  );

  const normalizedPlan = normalizePlanTier(prefs.activePlan);
  const hasBusinessAccess = isBusinessPlan(normalizedPlan);

  const [viewMode, setViewMode] = useState<'personal' | 'fleet'>(
    hasBusinessAccess ? 'fleet' : 'personal'
  );
  const [fleetTypeFilter, setFleetTypeFilter] = useState<'all' | 'car' | 'motorcycle'>('all');
  const [odometerInput, setOdometerInput] = useState<string>(
    String(activeVehicle?.odometerKm ?? 0)
  );
  const [weeklyKmInput, setWeeklyKmInput] = useState<string>(
    String(activeVehicle?.weeklyKm ?? 250)
  );
  const [odometerSaved, setOdometerSaved] = useState(false);
  const [showPassport, setShowPassport] = useState(false);

  const medicalRecordRef = useRef<HTMLDivElement | null>(null);
  const plansSectionRef = useRef<HTMLDivElement | null>(null);

  const activeVehicleId = activeVehicle?.id ?? '';
  const [lastSyncedId, setLastSyncedId] = useState(activeVehicleId);
  if (activeVehicleId !== lastSyncedId) {
    setLastSyncedId(activeVehicleId);
    setOdometerInput(String(activeVehicle?.odometerKm ?? 0));
    setWeeklyKmInput(String(activeVehicle?.weeklyKm ?? 250));
  }

  useEffect(() => {
    if (focusPlansSignal > 0) {
      window.setTimeout(() => {
        plansSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [focusPlansSignal]);

  const activePlanItem = useMemo(
    () =>
      localizedCatalogPlans.find((p) => p.id === normalizedPlan) ??
      localizedCatalogPlans[0] ??
      null,
    [localizedCatalogPlans, normalizedPlan]
  );
  const vehicleLimit = activePlanItem?.vehicleLimit ?? (hasBusinessAccess ? 10 : 1);
  const isFleetModeActive = viewMode === 'fleet' && hasBusinessAccess;

  const visibleLogs = useMemo(() => {
    if (!activeVehicle) return [];
    const filtered = isFleetModeActive
      ? logs
      : logs.filter((l) => l.vehicleId === activeVehicle.id);
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, isFleetModeActive, activeVehicle]);

  const totalSpend = useMemo(() => {
    if (!activeVehicle) return 0;
    const serviceTotal = visibleLogs.reduce(
      (acc, item) =>
        acc + convertCurrency(item.cost, item.currency ?? 'BRL', prefs.currency),
      0
    );
    const relevantSessions = isFleetModeActive
      ? chargingSessions
      : chargingSessions.filter((c) => c.vehicleId === activeVehicle.id);
    const chargeTotal = relevantSessions.reduce(
      (acc, c) => acc + convertCurrency(c.cost, c.currency ?? 'BRL', prefs.currency),
      0
    );
    return serviceTotal + chargeTotal;
  }, [visibleLogs, chargingSessions, isFleetModeActive, activeVehicle, prefs.currency]);

  const costPerKm = useMemo(() => {
    if (!activeVehicle) return 0;
    const baseKm = isFleetModeActive
      ? vehicles.reduce((acc, v) => acc + Math.max(1000, v.odometerKm), 0)
      : Math.max(1000, activeVehicle.odometerKm);
    return totalSpend / baseKm;
  }, [totalSpend, isFleetModeActive, vehicles, activeVehicle]);

  const today = todayIso();

  const fleetKpis = useMemo(() => {
    const currentMonth = today.slice(0, 7);
    let totalOdometer = 0;
    let overdueVehicles = 0;
    let upcomingRevisions = 0;
    let expiringDocuments = 0;

    for (const v of vehicles) {
      totalOdometer += v.odometerKm;
      const vItems = maintenanceItems.filter((i) => i.vehicleId === v.id);
      let hasOverdue = false;
      let hasAttentionOrRevision = false;
      for (const item of vItems) {
        const res = computeMaintenanceStatus(item, v, prefs);
        if (res.status === MaintenanceStatus.OVERDUE) {
          hasOverdue = true;
        } else if (res.status === MaintenanceStatus.ATTENTION) {
          hasAttentionOrRevision = true;
        }
      }
      if (hasOverdue) overdueVehicles++;
      if (hasAttentionOrRevision) upcomingRevisions++;

      const docDays = isDateRecorded(v.documentExpiryDate)
        ? daysBetween(today, v.documentExpiryDate)
        : null;
      const insDays = isDateRecorded(v.insuranceExpiryDate)
        ? daysBetween(today, v.insuranceExpiryDate)
        : null;
      if (
        (docDays !== null && docDays <= prefs.docReminderDays) ||
        (insDays !== null && insDays <= prefs.docReminderDays)
      ) {
        expiringDocuments++;
      }
    }

    const monthlySpend =
      logs
        .filter((l) => l.date.startsWith(currentMonth))
        .reduce((acc, l) => acc + convertCurrency(l.cost, l.currency ?? 'BRL', prefs.currency), 0) +
      chargingSessions
        .filter((c) => c.date.startsWith(currentMonth))
        .reduce((acc, c) => acc + convertCurrency(c.cost, c.currency ?? 'BRL', prefs.currency), 0);

    return {
      totalOdometer,
      overdueVehicles,
      upcomingRevisions,
      expiringDocuments,
      monthlySpend,
    };
  }, [vehicles, maintenanceItems, logs, chargingSessions, prefs, today]);

  const assignablePeople = useMemo(() => {
    const list: Array<{ name: string; email: string; roleLabel: string }> = [];
    if (cloudUserEmail) {
      list.push({
        name: gCopy.accountOwner,
        email: cloudUserEmail,
        roleLabel: gCopy.ownerRole,
      });
    }
    for (const m of orgMembers) {
      if (m.inviteStatus === 'revoked') continue;
      list.push({
        name: m.memberName || m.memberEmail,
        email: m.memberEmail,
        roleLabel: m.role,
      });
    }
    return list;
  }, [cloudUserEmail, orgMembers, gCopy.accountOwner, gCopy.ownerRole]);

  const scrollToPlans = () => {
    plansSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!activeVehicle || vehicles.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.garage.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.garage.subtitle}
          </p>
        </div>

        <div className="autolife-glass rounded-2xl p-10 text-center space-y-4">
          <Car className="w-10 h-10 text-sky-500 dark:text-sky-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              {ui.garageUi.emptyTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {ui.garageUi.emptyDesc}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenAddVehicle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>{t.actions.addVehicle}</span>
            </button>
            {!cloudUserId && (
              <button
                type="button"
                onClick={onOpenCloudSettings}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
              >
                <span>{gCopy.signInBtn}</span>
              </button>
            )}
          </div>
        </div>

        <div ref={plansSectionRef}>
          <SubscriptionPlansSection
            catalogPlans={catalogPlans}
            catalogSource={catalogSource}
            subscription={subscription}
            payments={payments}
            vehiclesCount={vehicles.length}
            prefs={prefs}
            t={t}
            cloudUserId={cloudUserId}
            cloudUserEmail={cloudUserEmail}
            onUpdatePrefs={onUpdatePrefs}
            onSubscriptionUpdated={onSubscriptionUpdated}
            onRefreshSubscription={onRefreshSubscription}
          />
        </div>
      </div>
    );
  }

  const handleOdometerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(odometerInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    onUpdateOdometer(activeVehicle.id, Math.round(parsed));
    setOdometerSaved(true);
    setTimeout(() => setOdometerSaved(false), 2000);
  };

  const currencyMeta = CURRENCY_CATALOG[prefs.currency] ?? CURRENCY_CATALOG.BRL;

  const handleExportCsv = () => {
    const header = [...gCopy.csvHeaders, `${gCopy.ledgerAmount} (${prefs.currency})`];
    const rows = visibleLogs.map((log) => {
      const veh = vehicles.find((v) => v.id === log.vehicleId);
      const converted = convertCurrency(log.cost, log.currency ?? 'BRL', prefs.currency);
      return [
        log.date,
        veh ? `${veh.make} ${veh.model}` : log.vehicleId,
        t.categories[log.category],
        log.title,
        String(log.odometerKm),
        log.workshopName,
        converted.toFixed(currencyMeta.decimals),
      ];
    });
    downloadCsv(gCopy.csvFilename, [header, ...rows]);
  };

  const handleDownloadFleetPdf = () => {
    const { blob, filename } = generateFleetSummaryPdf({
      organizationName: organization?.name || gCopy.fleetDefaultName,
      vehicles,
      maintenanceItems,
      logs,
      chargingSessions,
      prefs,
    });
    downloadPdfBlob(blob, filename);
  };

  const hasLicenseDate = isDateRecorded(activeVehicle.documentExpiryDate);
  const hasInsuranceDate = isDateRecorded(activeVehicle.insuranceExpiryDate);
  const licenseDaysLeft = hasLicenseDate
    ? daysBetween(today, activeVehicle.documentExpiryDate)
    : null;
  const insuranceDaysLeft = hasInsuranceDate
    ? daysBetween(today, activeVehicle.insuranceExpiryDate)
    : null;

  const analyticsVehicles = isFleetModeActive ? vehicles : [activeVehicle];

  return (
    <div className="space-y-8">
      {/* Header + Consumer vs. B2B Fleet Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isFleetModeActive ? gCopy.fleetHeaderTitle : t.garage.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isFleetModeActive
              ? `${organization?.name || gCopy.companyFallback} · ${vehicles.length}${
                  vehicleLimit !== null ? ` / ${vehicleLimit}` : ''
                } ${gCopy.activeVehiclesLabel}`
              : `${t.garage.subtitle} · ${activePlanItem?.name ?? gCopy.personalPlanFallback}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppConnectButton
            whatsappNumber={prefs.whatsappNumber}
            language={prefs.language}
            label={ui.whatsapp.buttonLabel}
            title={gCopy.sendVehicleWaTitle}
            message={buildVehicleWhatsAppText({
              vehicle: activeVehicle,
              units: prefs.units,
              language: prefs.language,
            })}
            onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
          />
          <button
            type="button"
            onClick={() =>
              medicalRecordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors whitespace-nowrap shrink-0"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{ui.garageUi.actions.medical}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPassport(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{ui.garageUi.actions.passport}</span>
          </button>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('personal')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'personal'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.garage.modePersonal}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('fleet')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'fleet'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {!hasBusinessAccess && <Lock className="w-3 h-3 text-amber-500" />}
              <span>
                {gCopy.fleetModeBtn}
                {hasBusinessAccess ? ` (${vehicles.length})` : ''}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Vehicle Visual Banner + Multi-Vehicle Quick Switcher */}
      <section className="autolife-glass rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-28 sm:w-36 h-20 sm:h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-sky-400/25 bg-slate-900 shrink-0">
            <VehicleVisual
              vehicle={activeVehicle}
              attachments={attachments}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">
              {activeVehicle.vehicleType === 'motorcycle' ? (
                <Bike className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Car className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {t.vehicleTypes[activeVehicle.vehicleType ?? 'car']}
                {activeVehicle.vehicleType === 'motorcycle' && activeVehicle.engineDisplacementCc
                  ? ` ${activeVehicle.engineDisplacementCc}cc`
                  : ''}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{t.powertrain[activeVehicle.powertrain]}</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
              {activeVehicle.make} {activeVehicle.model} ({activeVehicle.year})
            </h2>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span>{activeVehicle.plate}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-800 dark:text-sky-300 font-semibold">
                {formatDistance(activeVehicle.odometerKm, prefs.units)}
              </span>
              {activeVehicle.color && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5 font-sans text-slate-700 dark:text-slate-200">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                      style={{
                        backgroundColor: resolveVehicleColorStyle(activeVehicle.color).primaryHex,
                      }}
                    />
                    <span>{getLocalizedColorLabel(activeVehicle.color, prefs.language)}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {vehicles.length > 1 && (
            <select
              aria-label={gCopy.selectVehicleAria}
              value={activeVehicle.id}
              onChange={(e) => onSelectVehicle(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleType === 'motorcycle' ? `[${t.vehicleTypes.motorcycle}] ` : ''}
                  {v.make} {v.model} ({v.year})
                </option>
              ))}
            </select>
          )}
          {onEditVehicle && (
            <button
              type="button"
              onClick={() => onEditVehicle(activeVehicle)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0c1629] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#101d36] transition-colors whitespace-nowrap shrink-0"
            >
              <Pencil className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{ui.garageUi.actions.edit}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddVehicle}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0c1629] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#101d36] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{t.actions.addVehicle}</span>
          </button>
          <button
            type="button"
            onClick={() => onDeleteVehicle(activeVehicle.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{ui.garageUi.actions.remove}</span>
          </button>
        </div>
      </section>

      {/* B2B Fleet Mode OR Gate OR Personal Specs */}
      {viewMode === 'fleet' && !hasBusinessAccess ? (
        <section className="autolife-glass rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Building2 className="w-4 h-4" />
              <span>{gCopy.gateBadge}</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              {ui.garageUi.fleet.gateTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {ui.garageUi.fleet.gateDesc}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={scrollToPlans}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white whitespace-nowrap shrink-0"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{gCopy.viewFleetPlansBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('personal')}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                {gCopy.backToPersonalBtn}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs shrink-0">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {gCopy.multiVehiclesTitle}
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">
                {gCopy.multiVehiclesDesc}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {gCopy.teamPermTitle}
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">
                {gCopy.teamPermDesc}
              </div>
            </div>
          </div>
        </section>
      ) : isFleetModeActive ? (
        <div className="space-y-6">
          {/* Limit reached expansion banner */}
          {vehicleLimit !== null && vehicles.length >= vehicleLimit && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <strong>
                    {gCopy.limitReachedTitle} ({vehicles.length}/{vehicleLimit}).
                  </strong>{' '}
                  {gCopy.limitReachedDesc}
                </div>
              </div>
              <button
                type="button"
                onClick={scrollToPlans}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap shrink-0"
              >
                {gCopy.expandFleetBtn}
              </button>
            </div>
          )}

          {/* Enterprise Fleet KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 tabular-nums">
            <div className="autolife-glass rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {gCopy.kpiFleetVehicles}
              </div>
              <div className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {vehicles.length}
                <span className="text-xs font-normal text-slate-400">
                  {vehicleLimit !== null ? ` / ${vehicleLimit}` : ` ${gCopy.unlimited}`}
                </span>
              </div>
            </div>
            <div className="autolife-glass rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {gCopy.kpiTotalOdo}
              </div>
              <div className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatDistance(fleetKpis.totalOdometer, prefs.units)}
              </div>
            </div>
            <div className="autolife-glass rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {gCopy.kpiOverdue}
              </div>
              <div
                className={`mt-1 font-display text-xl font-bold ${
                  fleetKpis.overdueVehicles > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {fleetKpis.overdueVehicles} {gCopy.vehicleUnitSuffix}
              </div>
            </div>
            <div className="autolife-glass rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {gCopy.kpiUpcoming}
              </div>
              <div className="mt-1 font-display text-xl font-bold text-amber-600 dark:text-amber-400">
                {fleetKpis.upcomingRevisions} {gCopy.revShort} · {fleetKpis.expiringDocuments}{' '}
                {gCopy.docShort}
              </div>
            </div>
            <div className="autolife-glass rounded-2xl p-4 col-span-2 lg:col-span-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {gCopy.kpiMonthlySpend}
              </div>
              <div className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(fleetKpis.monthlySpend, prefs.currency)}
              </div>
            </div>
          </div>

          {/* Fleet Matrix Table */}
          <section className="autolife-glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t.garage.allVehicles}
                </h2>
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {(
                    [
                      { id: 'all', label: `${ui.garageUi.fleet.filterAll} (${vehicles.length})` },
                      {
                        id: 'car',
                        label: `${t.vehicleTypes.car} (${vehicles.filter((v) => (v.vehicleType ?? 'car') === 'car').length})`,
                      },
                      {
                        id: 'motorcycle',
                        label: `${t.vehicleTypes.motorcycle} (${vehicles.filter((v) => v.vehicleType === 'motorcycle').length})`,
                      },
                    ] as const
                  ).map((ft) => (
                    <button
                      key={ft.id}
                      type="button"
                      onClick={() => setFleetTypeFilter(ft.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        fleetTypeFilter === ft.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadFleetPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{gCopy.fleetPdfBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAddVehicle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.actions.addVehicle}</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-5">{ui.garageUi.fleet.colVehicle}</th>
                    <th className="py-3 px-4">{gCopy.colPlateType}</th>
                    <th className="py-3 px-4">{ui.garageUi.fleet.colStatus}</th>
                    <th className="py-3 px-4 text-right">{ui.garageUi.fleet.colOdometer}</th>
                    <th className="py-3 px-4 text-right">{gCopy.colMonthlySpend}</th>
                    <th className="py-3 px-4">{gCopy.colExpiries}</th>
                    <th className="py-3 px-4">{ui.garageUi.fleet.colDriver}</th>
                    <th className="py-3 px-5 text-right">{ui.garageUi.fleet.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  {vehicles
                    .filter((v) =>
                      fleetTypeFilter === 'all'
                        ? true
                        : (v.vehicleType ?? 'car') === fleetTypeFilter
                    )
                    .map((v) => {
                      const isSelected = v.id === activeVehicle.id;
                      const vType = v.vehicleType ?? 'car';
                      const vItems = maintenanceItems.filter((i) => i.vehicleId === v.id);
                      const vOverdue = vItems.filter(
                        (i) => computeMaintenanceStatus(i, v, prefs).status === MaintenanceStatus.OVERDUE
                      ).length;
                      const vAttention = vItems.filter(
                        (i) => computeMaintenanceStatus(i, v, prefs).status === MaintenanceStatus.ATTENTION
                      ).length;

                      const currentMonth = today.slice(0, 7);
                      const vMonthSpend =
                        logs
                          .filter((l) => l.vehicleId === v.id && l.date.startsWith(currentMonth))
                          .reduce(
                            (acc, l) => acc + convertCurrency(l.cost, l.currency ?? 'BRL', prefs.currency),
                            0
                          ) +
                        chargingSessions
                          .filter((c) => c.vehicleId === v.id && c.date.startsWith(currentMonth))
                          .reduce(
                            (acc, c) => acc + convertCurrency(c.cost, c.currency ?? 'BRL', prefs.currency),
                            0
                          );

                      return (
                        <tr
                          key={v.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-5 font-medium text-slate-900 dark:text-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectVehicle(v.id);
                                setTimeout(() => {
                                  medicalRecordRef.current?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start',
                                  });
                                }, 60);
                              }}
                              className="text-left hover:underline focus-visible:outline-2 focus-visible:outline-sky-500 flex items-center gap-2.5"
                            >
                              <div className="w-10 h-7 rounded-md overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 shrink-0">
                                <VehicleVisual
                                  vehicle={v}
                                  attachments={attachments}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span>
                                {v.make} {v.model} ({v.year})
                              </span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            <span className="font-mono font-semibold">{v.plate}</span> ·{' '}
                            {t.vehicleTypes[vType]}
                          </td>
                          <td className="py-3 px-4 text-xs whitespace-nowrap">
                            {vOverdue > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>
                                  {vOverdue} {gCopy.overdueSuffix}
                                </span>
                              </span>
                            ) : vAttention > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {vAttention} {gCopy.attentionSuffix}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{ui.garageUi.fleet.statusOk}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatDistance(v.odometerKm, prefs.units)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {formatCurrency(vMonthSpend, prefs.currency)}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <div>
                              {gCopy.docShort}:{' '}
                              {isDateRecorded(v.documentExpiryDate)
                                ? v.documentExpiryDate
                                : '—'}
                            </div>
                            <div>
                              {gCopy.insShort}:{' '}
                              {isDateRecorded(v.insuranceExpiryDate)
                                ? v.insuranceExpiryDate
                                : '—'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <select
                              value={v.assignedMemberEmail ?? ''}
                              onChange={(e) => {
                                const email = e.target.value;
                                const match = assignablePeople.find((p) => p.email === email);
                                onAssignVehicleMember(v.id, match?.name ?? '', email);
                              }}
                              className="px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 max-w-[160px]"
                            >
                              <option value="">{ui.garageUi.fleet.unassigned}</option>
                              {assignablePeople.map((p) => (
                                <option key={p.email} value={p.email}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectVehicle(v.id);
                                  setShowPassport(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title={ui.garageUi.actions.passport}
                              >
                                <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>{gCopy.qrShort}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectVehicle(v.id);
                                  setTimeout(() => {
                                    medicalRecordRef.current?.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'start',
                                    });
                                  }, 60);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                <span>{gCopy.ficheShort}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteVehicle(v.id)}
                                className="p-1.5 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                aria-label={gCopy.removeVehicleAria}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Company Profile, Multi-Tenant Isolation & Team Permissions */}
          <FleetTeamSection
            organization={organization}
            members={orgMembers}
            cloudUserId={cloudUserId}
            language={prefs.language}
            maxTeamMembers={activePlanItem?.maxTeamMembers ?? 10}
            onOrganizationUpdated={onOrganizationUpdated}
            onMembersChanged={onMembersChanged}
            onOpenCloudSettings={onOpenCloudSettings}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Vehicle Specs, Odometer & Predictive Driving Profile */}
          <section className="autolife-glass rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t.garage.specsTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t.vehicleTypes[activeVehicle.vehicleType ?? 'car']} · {activeVehicle.make}{' '}
                  {activeVehicle.model} · {activeVehicle.year} ·{' '}
                  <span className="font-mono">{activeVehicle.plate}</span>
                </p>
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                {t.powertrain[activeVehicle.powertrain]}
                {activeVehicle.engineDisplacementCc
                  ? ` · ${activeVehicle.engineDisplacementCc}cc`
                  : ''}
              </span>
            </div>

            <form onSubmit={handleOdometerSubmit} className="pt-1 flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label
                  htmlFor="odometer-update-input"
                  className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
                >
                  {t.health.odometerLabel} (km)
                </label>
                <div className="relative">
                  <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="odometer-update-input"
                    type="number"
                    min={0}
                    value={odometerInput}
                    onChange={(e) => setOdometerInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  {odometerSaved ? '✓' : t.actions.updateOdometer}
                </button>
              </div>
            </form>

            {/* Quick Color Editor */}
            {onUpdateVehicle && (
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    {ui.garageUi.specs.colorLabel}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-sky-200">
                    {activeVehicle.color
                      ? getLocalizedColorLabel(activeVehicle.color, prefs.language)
                      : ui.garageUi.specs.notInformed}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {VEHICLE_COLOR_SWATCHES.map((swatch) => {
                    const currentColorKey = activeVehicle.color
                      ? resolveVehicleColorStyle(activeVehicle.color).searchKeywordEn
                      : '';
                    const isSelected = Boolean(activeVehicle.color) && currentColorKey === swatch.id;
                    const localizedSwatchName = getLocalizedColorLabel(swatch.id, prefs.language);
                    const isLightSwatch =
                      swatch.id === 'white' || swatch.id === 'silver' || swatch.id === 'yellow';
                    return (
                      <button
                        key={swatch.id}
                        type="button"
                        onClick={() =>
                          onUpdateVehicle({
                            ...activeVehicle,
                            color: localizedSwatchName,
                          })
                        }
                        title={localizedSwatchName}
                        aria-label={`${gCopy.setColorAria} ${localizedSwatchName}`}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform border ${
                          isSelected
                            ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-white dark:ring-offset-[#0c1629] scale-110'
                            : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: swatch.primaryHex,
                          borderColor: swatch.borderHex,
                        }}
                      >
                        {isSelected && (
                          <Check
                            className={`w-3 h-3 ${
                              isLightSwatch ? 'text-slate-900' : 'text-white'
                            }`}
                            strokeWidth={2.5}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Predictive Severity & Weekly Mileage */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {gCopy.drivingProfileLabel}
                </label>
                <select
                  value={activeVehicle.drivingProfile ?? 'mixed'}
                  onChange={(e) =>
                    onUpdateDrivingProfile(
                      activeVehicle.id,
                      e.target.value as DrivingProfile,
                      Number(weeklyKmInput) || 250
                    )
                  }
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="urban_severe">{gCopy.profileUrban}</option>
                  <option value="mixed">{gCopy.profileMixed}</option>
                  <option value="highway">{gCopy.profileHighway}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {gCopy.weeklyAvgLabel}
                </label>
                <input
                  type="number"
                  min={20}
                  max={3000}
                  value={weeklyKmInput}
                  onChange={(e) => {
                    setWeeklyKmInput(e.target.value);
                    const val = Math.max(20, Number(e.target.value) || 250);
                    onUpdateDrivingProfile(
                      activeVehicle.id,
                      activeVehicle.drivingProfile ?? 'mixed',
                      val
                    );
                  }}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {vehicles.length}
                  {vehicleLimit !== null ? `/${vehicleLimit}` : ''} {gCopy.vehiclesInPlanSuffix}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenAddVehicle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.actions.addVehicle}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteVehicle(activeVehicle.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{gCopy.removeVehicleAndHistory}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Documentation Expiry */}
          <section className="autolife-glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {t.garage.docsTitle}
              </h2>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t.garage.docLicense}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {hasLicenseDate
                      ? `${t.garage.expiresOn} ${activeVehicle.documentExpiryDate}`
                      : t.health.notRecorded}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasLicenseDate && licenseDaysLeft !== null ? (
                    <span
                      className={`text-xs font-semibold font-mono whitespace-nowrap ${
                        licenseDaysLeft <= prefs.docReminderDays
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {licenseDaysLeft}d
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-slate-400">—</span>
                  )}
                  <WhatsAppConnectButton
                    whatsappNumber={prefs.whatsappNumber}
                    language={prefs.language}
                    compact
                    label=""
                    title={gCopy.sendDocWaTitle}
                    message={`${gCopy.waDocHeader}\n${gCopy.waVehicleLabel}: ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.plate})\n${t.garage.docLicense}: ${
                      hasLicenseDate
                        ? `${gCopy.waExpiresOn} ${activeVehicle.documentExpiryDate}`
                        : t.health.notRecorded
                    }`}
                    onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                  />
                  {hasLicenseDate && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadCalendarEvent({
                          title: `${t.garage.docLicense} — ${activeVehicle.make} ${activeVehicle.model}`,
                          description: `${activeVehicle.plate} (${t.garage.expiresOn} ${activeVehicle.documentExpiryDate})`,
                          dateIso: activeVehicle.documentExpiryDate,
                          filename: `${gCopy.calDocPrefix}-${activeVehicle.plate}.ics`,
                        })
                      }
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                      title={gCopy.addCalTitle}
                      aria-label={gCopy.addCalAria}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t.garage.docInsurance}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {hasInsuranceDate
                      ? `${t.garage.expiresOn} ${activeVehicle.insuranceExpiryDate}`
                      : t.health.notRecorded}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasInsuranceDate && insuranceDaysLeft !== null ? (
                    <span
                      className={`text-xs font-semibold font-mono whitespace-nowrap ${
                        insuranceDaysLeft <= prefs.docReminderDays
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {insuranceDaysLeft}d
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-slate-400">—</span>
                  )}
                  <WhatsAppConnectButton
                    whatsappNumber={prefs.whatsappNumber}
                    language={prefs.language}
                    compact
                    label=""
                    title={gCopy.sendInsWaTitle}
                    message={`${gCopy.waInsHeader}\n${gCopy.waVehicleLabel}: ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.plate})\n${t.garage.docInsurance}: ${
                      hasInsuranceDate
                        ? `${gCopy.waExpiresOn} ${activeVehicle.insuranceExpiryDate}`
                        : t.health.notRecorded
                    }`}
                    onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                  />
                  {hasInsuranceDate && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadCalendarEvent({
                          title: `${t.garage.docInsurance} — ${activeVehicle.make} ${activeVehicle.model}`,
                          description: `${activeVehicle.plate} (${t.garage.expiresOn} ${activeVehicle.insuranceExpiryDate})`,
                          dateIso: activeVehicle.insuranceExpiryDate,
                          filename: `${gCopy.calInsPrefix}-${activeVehicle.plate}.ics`,
                        })
                      }
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                      title={gCopy.addCalTitle}
                      aria-label={gCopy.addCalAria}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Ficha Médica Completa (Linha do Tempo de Manutenções, Revisões, Abastecimentos, EV, Gastos e Notas) */}
      <div ref={medicalRecordRef}>
        <VehicleMedicalRecordPanel
          vehicle={activeVehicle}
          maintenanceItems={maintenanceItems}
          logs={logs}
          chargingSessions={chargingSessions}
          attachments={attachments}
          attachmentsLoading={attachmentsLoading}
          prefs={prefs}
          t={t}
          cloudUserId={cloudUserId}
          cloudUserEmail={cloudUserEmail}
          onAddServiceLog={onAddServiceLog}
          onAddChargingSession={onAddChargingSession}
          onMarkMaintenanceChecked={onMarkMaintenanceChecked}
          onAttachmentCreated={onAttachmentCreated}
          onAttachmentDeleted={onAttachmentDeleted}
          onOpenCloudSettings={onOpenCloudSettings}
          onUpdatePrefs={onUpdatePrefs}
        />
      </div>

      {/* Analytics & EV Charging Trends */}
      <FleetAnalyticsSection
        vehicles={analyticsVehicles}
        activeVehicle={activeVehicle}
        logs={logs}
        chargingSessions={chargingSessions}
        prefs={prefs}
      />

      {/* Monthly Carbon Footprint & EV Impact Reduction */}
      <CarbonFootprintSection
        vehicles={analyticsVehicles}
        activeVehicle={activeVehicle}
        logs={logs}
        chargingSessions={chargingSessions}
        prefs={prefs}
      />

      {/* Digital Vault for Vehicle Photos, Documents & Receipts */}
      <div className="space-y-3">
        {attachmentsError && (
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300">
            {attachmentsError}
          </div>
        )}
        <VehicleVaultSection
          activeVehicle={activeVehicle}
          cloudUserId={cloudUserId}
          onOpenCloudSettings={onOpenCloudSettings}
          language={prefs.language}
          whatsappNumber={prefs.whatsappNumber}
          onUpdatePrefs={onUpdatePrefs}
          externalAttachments={attachments}
          externalLoading={attachmentsLoading}
          onAttachmentCreated={onAttachmentCreated}
          onAttachmentDeleted={onAttachmentDeleted}
        />
      </div>

      {/* Service & TCO Cost Ledger */}
      <section className="autolife-glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {t.garage.ledgerTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5 flex flex-wrap items-center gap-2">
              <span>
                {gCopy.accumulatedTco}{' '}
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(totalSpend, prefs.currency)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {gCopy.costPerKm}{' '}
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(costPerKm, prefs.currency)}/km
                </strong>
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 w-fit"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.actions.exportCsv}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-3 px-5">{gCopy.ledgerDate}</th>
                <th className="py-3 px-4">{gCopy.ledgerVehicle}</th>
                <th className="py-3 px-4">{gCopy.ledgerService}</th>
                <th className="py-3 px-4">{gCopy.ledgerWorkshop}</th>
                <th className="py-3 px-4 text-right">{gCopy.ledgerOdometer}</th>
                <th className="py-3 px-4 text-right">{gCopy.ledgerAmount}</th>
                <th className="py-3 px-5 text-right">{ui.whatsapp.buttonLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
              {visibleLogs.map((log) => {
                const veh = vehicles.find((v) => v.id === log.vehicleId) ?? activeVehicle;
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-5 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {log.date}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {veh ? `${veh.make} ${veh.model}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {log.title}
                      </div>
                      {log.notes && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {log.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {log.workshopName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDistance(log.odometerKm, prefs.units)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCurrency(
                        convertCurrency(log.cost, log.currency ?? 'BRL', prefs.currency),
                        prefs.currency
                      )}
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <WhatsAppConnectButton
                        whatsappNumber={prefs.whatsappNumber}
                        language={prefs.language}
                        compact
                        label={gCopy.sendBtn}
                        message={buildServiceLogWhatsAppText({
                          vehicle: veh,
                          log,
                          currency: prefs.currency,
                          units: prefs.units,
                          language: prefs.language,
                        })}
                        onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* International DB-Driven Commercial Plans & Subscription Management */}
      <div ref={plansSectionRef}>
        <SubscriptionPlansSection
          catalogPlans={catalogPlans}
          catalogSource={catalogSource}
          subscription={subscription}
          payments={payments}
          vehiclesCount={vehicles.length}
          prefs={prefs}
          t={t}
          cloudUserId={cloudUserId}
          cloudUserEmail={cloudUserEmail}
          onUpdatePrefs={onUpdatePrefs}
          onSubscriptionUpdated={onSubscriptionUpdated}
          onRefreshSubscription={onRefreshSubscription}
        />
      </div>

      {/* Verifiable Digital Vehicle Passport Modal + QR Code */}
      {showPassport && (
        <VehiclePassportModal
          vehicle={activeVehicle}
          maintenanceItems={maintenanceItems}
          logs={logs}
          attachments={attachments}
          odometerEvents={odometerEvents.filter((e) => e.vehicleId === activeVehicle.id)}
          prefs={prefs}
          t={t}
          cloudUserId={cloudUserId}
          onUpdatePrefs={onUpdatePrefs}
          onClose={() => setShowPassport(false)}
        />
      )}
    </div>
  );
}
