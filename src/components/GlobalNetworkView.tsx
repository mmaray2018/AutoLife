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
import {
  MaintenanceItem,
  MaintenanceStatus,
  NetworkPartner,
  PowertrainType,
  UserPreferences,
  Vehicle,
  VehicleType,
} from '../types/autolife';
import { computeMaintenanceStatus, formatDistance } from '../utils/autolife';
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

const CATEGORY_MAP_TERMS: Record<'all' | NetworkPartner['category'], string> = {
  all: 'Oficina mecânica automotiva',
  workshop: 'Oficina mecânica',
  ev_charger: 'Carregador veículo elétrico eletroposto',
  tires: 'Centro automotivo pneus alinhamento',
  fuel: 'Posto de combustível',
  dealership: 'Concessionária autorizada',
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
  const [placeCountry, setPlaceCountry] = useState('Brasil');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeSpecialties, setPlaceSpecialties] = useState('');
  const [supportsCar, setSupportsCar] = useState(true);
  const [supportsMoto, setSupportsMoto] = useState(true);

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
      setGeoMessage(
        'Geolocalização não suportada neste navegador. Informe sua cidade ou bairro abaixo para buscar no Google Maps.'
      );
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

    const handleFinalError = (err: GeolocationPositionError) => {
      setLocating(false);
      if (err.code === 1) {
        setGeoMessage(
          'Permissão de localização bloqueada no navegador. Libere o acesso no cadeado da URL ou informe sua cidade/bairro abaixo.'
        );
      } else if (err.code === 2) {
        setGeoMessage(
          'Localização do dispositivo indisponível no momento. Digite sua cidade ou bairro abaixo para buscar oficinas próximas.'
        );
      } else {
        setGeoMessage(
          'Tempo esgotado ao obter coordenadas GPS. Informe sua cidade/bairro abaixo para buscar no Google Maps.'
        );
      }
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (firstErr) => {
        if (firstErr.code === 1) {
          handleFinalError(firstErr);
          return;
        }
        // Fallback attempt with high accuracy disabled / shorter max age if coarse check failed
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
    const baseCategory = CATEGORY_MAP_TERMS[categoryFilter] ?? CATEGORY_MAP_TERMS.all;
    const vehicleHint =
      vehicleFilter === 'motorcycle'
        ? 'moto'
        : vehicleFilter === 'car'
        ? 'carro'
        : vehicle?.vehicleType === 'motorcycle'
        ? 'moto'
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
  }, [categoryFilter, vehicleFilter, vehicle?.vehicleType, searchQuery, manualLocationQuery, userCoords]);

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
      city: placeCity.trim() || 'Minha cidade',
      country: placeCountry.trim() || 'Brasil',
      address: placeAddress.trim() || 'Endereço não informado',
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 w-fit disabled:opacity-60"
          >
            <LocateFixed className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {locating
                ? 'Obtendo GPS...'
                : userCoords
                ? 'Localização ativa'
                : 'Usar minha localização'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0 w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Local</span>
          </button>
        </div>
      </div>

      {geoMessage && (
        <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>{geoMessage}</span>
          <input
            type="text"
            value={manualLocationQuery}
            onChange={(e) => setManualLocationQuery(e.target.value)}
            placeholder="Cidade / Bairro (ex.: Lisboa, São Paulo)"
            className="px-2.5 py-1.5 text-xs rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 sm:w-64"
          />
        </div>
      )}

      {/* Filters & Real Map Lookup Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
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
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
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
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    vehicleFilter === vt.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
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
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <div className="relative w-full xl:w-48">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={manualLocationQuery}
                onChange={(e) => setManualLocationQuery(e.target.value)}
                placeholder="Cidade / Região"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <a
              href={liveMapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Buscar no Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Saved Trusted Places */}
      {filteredPartners.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
          <MapPin className="w-9 h-9 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {places.length === 0
                ? 'Nenhum local de confiança cadastrado'
                : 'Nenhum local encontrado para este filtro'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Cadastre suas oficinas, postos, borracharias ou eletropostos favoritos, ou pesquise estabelecimentos reais próximos pelo Google Maps.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Local</span>
            </button>
            <a
              href={liveMapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span>Buscar no Google Maps</span>
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
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
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
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
                      aria-label="Remover local"
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

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
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
                      label="WhatsApp"
                      title="Enviar resumo deste local/serviço no WhatsApp cadastrado"
                      message={buildPartnerWhatsAppText({
                        partner,
                        vehicle,
                        urgentTitles: urgentItems.map(
                          (u) => t.items[u.item.titleKey]?.title ?? u.item.titleKey
                        ),
                        units: prefs.units,
                      })}
                      onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                    />
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Abrir rota no mapa"
                      aria-label="Abrir rota no mapa"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPartner(partner);
                        setVisitConfirmed(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Adicionar Local de Confiança
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label={t.actions.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlace} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Nome do local
                </label>
                <input
                  type="text"
                  required
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Categoria
                  </label>
                  <select
                    value={placeCategory}
                    onChange={(e) =>
                      setPlaceCategory(e.target.value as NetworkPartner['category'])
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={placeCity}
                    onChange={(e) => setPlaceCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={placeAddress}
                    onChange={(e) => setPlaceAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    País
                  </label>
                  <input
                    type="text"
                    value={placeCountry}
                    onChange={(e) => setPlaceCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Especialidades / Serviços (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={placeSpecialties}
                  onChange={(e) => setPlaceSpecialties(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300 pt-1">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supportsCar}
                    onChange={(e) => setSupportsCar(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>{t.vehicleTypes.car}</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supportsMoto}
                    onChange={(e) => setSupportsMoto(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>{t.vehicleTypes.motorcycle}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workshop Service Brief Modal */}
      {selectedPartner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5">
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label={t.actions.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
              <p>{t.network.checklistDesc}</p>
              {vehicle && (
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1 tabular-nums">
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
                        className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 dark:border-slate-800"
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
                label="Enviar no WhatsApp"
                message={buildPartnerWhatsAppText({
                  partner: selectedPartner,
                  vehicle,
                  urgentTitles: urgentItems.map(
                    (u) => t.items[u.item.titleKey]?.title ?? u.item.titleKey
                  ),
                  units: prefs.units,
                })}
                onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
              />
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {t.actions.close}
              </button>
              <button
                type="button"
                onClick={() => setVisitConfirmed(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
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
