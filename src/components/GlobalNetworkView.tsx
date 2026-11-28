import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import { getUi } from '../data/uiTranslations';
import {
  LanguageCode,
  MaintenanceItem,
  MaintenanceStatus,
  NetworkPartner,
  PowertrainType,
  UserPreferences,
  Vehicle,
  VehicleType,
} from '../types/autolife';
import { computeMaintenanceStatus, formatDistance } from '../utils/autolife';
import { getLocalizedCountryName } from '../utils/billing';
import { haversineDistanceKm } from '../utils/calendar';
import { buildPartnerWhatsAppText } from '../utils/whatsapp';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface GlobalNetworkViewProps {
  vehicle: Vehicle | null;
  maintenanceItems: MaintenanceItem[];
  prefs: UserPreferences;
  t: Translations;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
}

const SAVED_PLACES_KEY = 'autolife_saved_places_v1';

const NETWORK_EXTRA_COPY: Record<
  LanguageCode,
  {
    locating: string;
    cityPlaceholder: string;
    filterEmptyTitle: string;
    countryLabel: string;
    specialtiesLabel: string;
    sendWaBtn: string;
    sendWaTitle: string;
  }
> = {
  pt: {
    locating: 'Obtendo GPS...',
    cityPlaceholder: 'Cidade / Região',
    filterEmptyTitle: 'Nenhum local encontrado para este filtro',
    countryLabel: 'País',
    specialtiesLabel: 'Especialidades / Serviços (separados por vírgula)',
    sendWaBtn: 'Enviar no WhatsApp',
    sendWaTitle: 'Enviar resumo deste local para o WhatsApp cadastrado',
  },
  en: {
    locating: 'Locating GPS...',
    cityPlaceholder: 'City / Area',
    filterEmptyTitle: 'No places match this filter',
    countryLabel: 'Country',
    specialtiesLabel: 'Specialties / Services (comma-separated)',
    sendWaBtn: 'Send via WhatsApp',
    sendWaTitle: 'Send this place summary to your saved WhatsApp',
  },
  es: {
    locating: 'Obteniendo GPS...',
    cityPlaceholder: 'Ciudad / Zona',
    filterEmptyTitle: 'No se encontraron lugares para este filtro',
    countryLabel: 'País',
    specialtiesLabel: 'Especialidades / Servicios (separados por coma)',
    sendWaBtn: 'Enviar por WhatsApp',
    sendWaTitle: 'Enviar resumen de este lugar a tu WhatsApp guardado',
  },
  de: {
    locating: 'GPS wird gesucht...',
    cityPlaceholder: 'Stadt / Region',
    filterEmptyTitle: 'Keine Orte für diesen Filter gefunden',
    countryLabel: 'Land',
    specialtiesLabel: 'Leistungen / Fachgebiete (kommagetrennt)',
    sendWaBtn: 'Per WhatsApp senden',
    sendWaTitle: 'Zusammenfassung an gespeichertes WhatsApp senden',
  },
  fr: {
    locating: 'Localisation GPS...',
    cityPlaceholder: 'Ville / Zone',
    filterEmptyTitle: 'Aucun lieu trouvé pour ce filtre',
    countryLabel: 'Pays',
    specialtiesLabel: 'Spécialités / Services (séparés par virgule)',
    sendWaBtn: 'Envoyer par WhatsApp',
    sendWaTitle: 'Envoyer le résumé de ce lieu sur votre WhatsApp enregistré',
  },
};

function loadSavedPlaces(): NetworkPartner[] {
  try {
    const raw = localStorage.getItem(SAVED_PLACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function GlobalNetworkView({
  vehicle,
  maintenanceItems,
  prefs,
  t,
  onUpdatePrefs,
}: GlobalNetworkViewProps) {
  const bundle = getUi(prefs.language);
  const ui = bundle.networkUi;
  const extra = NETWORK_EXTRA_COPY[prefs.language] ?? NETWORK_EXTRA_COPY.en;
  const defaultCountryName = getLocalizedCountryName(
    prefs.countryCode ?? 'US',
    prefs.language
  );

  const [places, setPlaces] = useState<NetworkPartner[]>(loadSavedPlaces);
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | NetworkPartner['category']
  >('all');
  const [vehicleFilter, setVehicleFilter] = useState<'all' | VehicleType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<NetworkPartner | null>(null);
  const [visitConfirmed, setVisitConfirmed] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLocationQuery, setManualLocationQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  // Add real workshop / place modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [placeCategory, setPlaceCategory] = useState<NetworkPartner['category']>('workshop');
  const [placeCity, setPlaceCity] = useState('');
  const [placeCountry, setPlaceCountry] = useState(defaultCountryName);
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeSpecialties, setPlaceSpecialties] = useState('');
  const [supportsCar, setSupportsCar] = useState(true);
  const [supportsMoto, setSupportsMoto] = useState(true);

  useEffect(() => {
    setPlaceCountry((prev) => prev || defaultCountryName);
  }, [defaultCountryName]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places));
    } catch {
      // Ignore quota errors
    }
  }, [places]);

  const handleLocateMe = () => {
    setGeoMessage(null);
    if (!navigator.geolocation) {
      setGeoMessage(ui.geoUnsupported);
      return;
    }

    setLocating(true);
    const onSuccess = (pos: GeolocationPosition) => {
      setLocating(false);
      setGeoMessage(null);
      setUserCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    };

    const handleFinalError = () => {
      setLocating(false);
      setGeoMessage(ui.geoDenied);
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (firstErr) => {
        if (firstErr.code === 1) {
          handleFinalError();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          handleFinalError,
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const filteredPartners = useMemo(() => {
    return places
      .map((partner) => {
        const hasValidCoords = partner.lat !== 0 || partner.lng !== 0;
        const liveDistanceKm =
          userCoords && hasValidCoords
            ? haversineDistanceKm(userCoords.lat, userCoords.lng, partner.lat, partner.lng)
            : null;
        return { ...partner, liveDistanceKm };
      })
      .filter((partner) => {
        if (categoryFilter !== 'all' && partner.category !== categoryFilter) return false;
        if (vehicleFilter !== 'all') {
          const supportedTypes = partner.supportedVehicleTypes ?? ['car'];
          if (!supportedTypes.includes(vehicleFilter)) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const hay = [
            partner.name,
            partner.city,
            partner.country,
            partner.address,
            ...partner.specialties,
          ]
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        }
        return true;
      });
  }, [places, categoryFilter, vehicleFilter, searchQuery, userCoords]);

  const urgentItems = useMemo(() => {
    if (!vehicle) return [];
    return maintenanceItems
      .filter((item) => item.vehicleId === vehicle.id)
      .map((item) => ({
        item,
        computed: computeMaintenanceStatus(item, vehicle, prefs),
      }))
      .filter(
        (entry) =>
          entry.computed.status === MaintenanceStatus.OVERDUE ||
          entry.computed.status === MaintenanceStatus.ATTENTION
      );
  }, [maintenanceItems, vehicle, prefs]);

  const liveMapsSearchUrl = useMemo(() => {
    const baseCategory =
      categoryFilter === 'all'
        ? ui.mapSearchTerms.workshop
        : ui.mapSearchTerms[categoryFilter] ?? ui.mapSearchTerms.workshop;
    const vehicleHint =
      vehicleFilter === 'motorcycle'
        ? t.vehicleTypes.motorcycle
        : vehicleFilter === 'car'
        ? t.vehicleTypes.car
        : vehicle?.vehicleType === 'motorcycle'
        ? t.vehicleTypes.motorcycle
        : '';
    const terms = [
      baseCategory,
      vehicleHint,
      searchQuery.trim(),
      manualLocationQuery.trim(),
    ]
      .filter(Boolean)
      .join(' ');
    if (userCoords && !manualLocationQuery.trim()) {
      return `https://www.google.com/maps/search/${encodeURIComponent(terms)}/@${userCoords.lat},${userCoords.lng},14z`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(terms)}`;
  }, [
    categoryFilter,
    vehicleFilter,
    vehicle?.vehicleType,
    searchQuery,
    manualLocationQuery,
    userCoords,
    ui.mapSearchTerms,
    t.vehicleTypes,
  ]);

  const handleCreatePlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) return;
    const types: VehicleType[] = [];
    if (supportsCar) types.push('car');
    if (supportsMoto) types.push('motorcycle');
    if (types.length === 0) types.push('car');

    const newPlace: NetworkPartner = {
      id: `place-${Date.now()}`,
      name: placeName.trim(),
      category: placeCategory,
      city: placeCity.trim() || extra.cityPlaceholder,
      country: placeCountry.trim() || defaultCountryName,
      address: placeAddress.trim() || bundle.garageUi.specs.notInformed,
      lat: userCoords?.lat ?? 0,
      lng: userCoords?.lng ?? 0,
      distanceKm: 0,
      rating: 5,
      openNow: true,
      supportedPowertrains: [
        PowertrainType.GASOLINE,
        PowertrainType.DIESEL,
        PowertrainType.HYBRID,
        PowertrainType.ELECTRIC,
      ],
      supportedVehicleTypes: types,
      specialties: placeSpecialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    setPlaces((prev) => [newPlace, ...prev]);
    setPlaceName('');
    setPlaceCity('');
    setPlaceCountry(defaultCountryName);
    setPlaceAddress('');
    setPlaceSpecialties('');
    setShowAddModal(false);
  };

  const handleDeletePlace = (id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.network.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.network.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={locating}
            onClick={handleLocateMe}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl autolife-glass text-slate-800 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 w-fit disabled:opacity-60"
          >
            <LocateFixed className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>
              {locating
                ? extra.locating
                : userCoords
                ? ui.locActive
                : ui.useLocation}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlaceCountry(defaultCountryName);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0 w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{ui.addPlace}</span>
          </button>
        </div>
      </div>

      {geoMessage && (
        <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>{geoMessage}</span>
          <input
            type="text"
            value={manualLocationQuery}
            onChange={(e) => setManualLocationQuery(e.target.value)}
            placeholder={extra.cityPlaceholder}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-amber-300 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100 sm:w-64"
          />
        </div>
      )}

      {/* Filters & Real Map Lookup Toolbar */}
      <div className="autolife-glass rounded-2xl p-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-[#081020] border border-slate-200/60 dark:border-white/10 rounded-xl w-fit">
            {(
              [
                { id: 'all', label: t.network.allCategories },
                { id: 'workshop', label: t.network.workshop },
                { id: 'ev_charger', label: t.network.ev_charger },
                { id: 'tires', label: t.network.tires },
                { id: 'fuel', label: t.network.fuel },
                { id: 'dealership', label: t.network.dealership },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === tab.id
                    ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#081020] border border-slate-200/60 dark:border-white/10 rounded-xl w-fit">
              {(
                [
                  { id: 'all', label: t.network.allCategories },
                  { id: 'car', label: t.vehicleTypes.car },
                  { id: 'motorcycle', label: t.vehicleTypes.motorcycle },
                ] as const
              ).map((vt) => (
                <button
                  key={vt.id}
                  type="button"
                  onClick={() => setVehicleFilter(vt.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    vehicleFilter === vt.id
                      ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {vt.label}
                </button>
              ))}
            </div>

            <div className="relative w-full xl:w-52">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.network.searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <div className="relative w-full xl:w-48">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={manualLocationQuery}
                onChange={(e) => setManualLocationQuery(e.target.value)}
                placeholder={extra.cityPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <a
              href={liveMapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-sky-200 dark:border-sky-400/35 bg-sky-50/70 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{ui.searchMapsBtn}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Saved Trusted Places */}
      {filteredPartners.length === 0 ? (
        <div className="autolife-glass rounded-2xl p-10 text-center space-y-4">
          <MapPin className="w-9 h-9 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {places.length === 0 ? ui.emptyTitle : extra.filterEmptyTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {ui.emptyDesc}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setPlaceCountry(defaultCountryName);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{ui.addPlace}</span>
            </button>
            <a
              href={liveMapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <span>{ui.searchMapsBtn}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPartners.map((partner) => {
            const supportedTypes = partner.supportedVehicleTypes ?? ['car'];
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${partner.name}, ${partner.address}, ${partner.city}`
            )}`;

            return (
              <article
                key={partner.id}
                className="autolife-glass rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                        {t.network[partner.category]} · {partner.city}
                        {partner.country ? `, ${partner.country}` : ''}
                      </div>
                      <h2 className="mt-0.5 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                        {partner.name}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePlace(partner.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
                      aria-label={ui.removePlace}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{partner.address}</span>
                  </div>

                  {partner.specialties.length > 0 && (
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {partner.specialties.join(' · ')}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs tabular-nums">
                    {partner.liveDistanceKm !== null && (
                      <>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatDistance(partner.liveDistanceKm, prefs.units)}
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="text-slate-500 dark:text-slate-400">
                      {supportedTypes.map((st) => t.vehicleTypes[st]).join(' & ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <WhatsAppConnectButton
                      whatsappNumber={prefs.whatsappNumber}
                      language={prefs.language}
                      compact
                      label={bundle.whatsapp.buttonLabel}
                      title={extra.sendWaTitle}
                      message={buildPartnerWhatsAppText({
                        partner,
                        vehicle,
                        urgentTitles: urgentItems.map(
                          (u) => t.items[u.item.titleKey]?.title ?? u.item.titleKey
                        ),
                        units: prefs.units,
                        language: prefs.language,
                      })}
                      onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                    />
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      title={ui.openMaps}
                      aria-label={ui.openMaps}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPartner(partner);
                        setVisitConfirmed(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors whitespace-nowrap shrink-0"
                    >
                      {t.actions.schedule}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add Place Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/80 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="autolife-glass rounded-2xl max-w-md w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                {ui.addModalTitle}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label={t.actions.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlace} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {ui.placeName}
                </label>
                <input
                  type="text"
                  required
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {ui.placeCategory}
                  </label>
                  <select
                    value={placeCategory}
                    onChange={(e) =>
                      setPlaceCategory(e.target.value as NetworkPartner['category'])
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  >
                    <option value="workshop">{t.network.workshop}</option>
                    <option value="ev_charger">{t.network.ev_charger}</option>
                    <option value="tires">{t.network.tires}</option>
                    <option value="fuel">{t.network.fuel}</option>
                    <option value="dealership">{t.network.dealership}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {ui.placeCity}
                  </label>
                  <input
                    type="text"
                    value={placeCity}
                    onChange={(e) => setPlaceCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {ui.placeAddress}
                  </label>
                  <input
                    type="text"
                    value={placeAddress}
                    onChange={(e) => setPlaceAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {extra.countryLabel}
                  </label>
                  <input
                    type="text"
                    value={placeCountry}
                    onChange={(e) => setPlaceCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {extra.specialtiesLabel}
                </label>
                <input
                  type="text"
                  value={placeSpecialties}
                  onChange={(e) => setPlaceSpecialties(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300 pt-1">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supportsCar}
                    onChange={(e) => setSupportsCar(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600"
                  />
                  <span>{t.vehicleTypes.car}</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supportsMoto}
                    onChange={(e) => setSupportsMoto(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600"
                  />
                  <span>{t.vehicleTypes.motorcycle}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
                >
                  {ui.savePlace}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workshop Service Brief Modal */}
      {selectedPartner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="autolife-glass rounded-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t.network.checklistTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedPartner.name} — {selectedPartner.city}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label={t.actions.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
              <p>{t.network.checklistDesc}</p>
              {vehicle && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#081020]/70 text-xs space-y-1 tabular-nums">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {vehicle.make} {vehicle.model} ({vehicle.year}) · {vehicle.plate}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {t.powertrain[vehicle.powertrain]} ·{' '}
                    {formatDistance(vehicle.odometerKm, prefs.units)}
                  </div>
                </div>
              )}

              {urgentItems.length > 0 && (
                <ul className="space-y-1.5 text-xs">
                  {urgentItems.map(({ item, computed }) => {
                    const loc = t.items[item.titleKey];
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 dark:border-white/10"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {loc ? loc.title : item.titleKey}
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {t.status[computed.status]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <WhatsAppConnectButton
                whatsappNumber={prefs.whatsappNumber}
                language={prefs.language}
                label={extra.sendWaBtn}
                message={buildPartnerWhatsAppText({
                  partner: selectedPartner,
                  vehicle,
                  urgentTitles: urgentItems.map(
                    (u) => t.items[u.item.titleKey]?.title ?? u.item.titleKey
                  ),
                  units: prefs.units,
                  language: prefs.language,
                })}
                onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
              />
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300"
              >
                {t.actions.close}
              </button>
              <button
                type="button"
                onClick={() => setVisitConfirmed(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
              >
                {visitConfirmed ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{visitConfirmed ? '✓' : t.actions.schedule}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
