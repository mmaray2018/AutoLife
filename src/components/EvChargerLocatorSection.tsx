/// <reference types="google.maps" />
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  AlertCircle,
  BatteryCharging,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Route,
  Search,
  Star,
  Zap,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageCode, UserPreferences, Vehicle } from '../types/autolife';
import { formatDistance } from '../utils/autolife';

interface EvChargerLocatorSectionProps {
  vehicle: Vehicle;
  prefs: UserPreferences;
  onSelectStationForLog: (stationName: string) => void;
}

interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface ConnectorSummary {
  type: string;
  label: string;
  count: number;
  availableCount: number | null;
  maxChargeRateKw: number;
}

interface ChargerStationItem {
  id: string;
  place: google.maps.places.Place;
  name: string;
  address: string;
  location: LatLngLiteral;
  distanceMeters: number;
  rating: number | null;
  googleMapsUri: string;
  directionsUri: string;
  totalConnectors: number;
  availableConnectors: number | null;
  maxPowerKw: number;
  connectors: ConnectorSummary[];
}

interface ActiveRouteSummary {
  stationId: string;
  stationName: string;
  distanceMeters: number;
  durationSeconds: number;
  path: LatLngLiteral[];
}

interface LocatorCopy {
  title: string;
  subtitle: string;
  locateNow: string;
  liveTrackingOn: string;
  liveTrackingOff: string;
  searchPlaceholder: string;
  searchButton: string;
  radiusLabel: string;
  powerFilterAll: string;
  powerFilterFast: string;
  powerFilterUltra: string;
  connectorAll: string;
  searching: string;
  stationsFound: string;
  noStations: string;
  traceRoute: string;
  calculatingRoute: string;
  openInMaps: string;
  useInSession: string;
  liveStatusActive: string;
  gpsDeniedHint: string;
  missingKeyTitle: string;
  missingKeyBody: string;
  yourLocation: string;
  availableLabel: string;
  portsLabel: string;
  routeBannerTitle: string;
  clearRoute: string;
}

const LOCATOR_COPY: Record<LanguageCode, LocatorCopy> = {
  pt: {
    title: 'Localizador de Postos de Recarga em Tempo Real',
    subtitle:
      'Encontre eletropostos próximos via Google Maps ao vivo, filtre por potência kW/conector e trace a rota até o carregador.',
    locateNow: 'Usar meu GPS agora',
    liveTrackingOn: 'Tempo real ligado',
    liveTrackingOff: 'Seguir em tempo real',
    searchPlaceholder: 'Buscar cidade, rodovia ou endereço...',
    searchButton: 'Buscar',
    radiusLabel: 'Raio',
    powerFilterAll: 'Todas potências',
    powerFilterFast: 'Rápido (50+ kW)',
    powerFilterUltra: 'Ultra (150+ kW)',
    connectorAll: 'Todos conectores',
    searching: 'Buscando postos de recarga ao vivo...',
    stationsFound: 'eletropostos encontrados',
    noStations: 'Nenhum eletroposto encontrado neste raio ou filtro. Tente ampliar para 30 km ou 50 km.',
    traceRoute: 'Traçar rota',
    calculatingRoute: 'Calculando rota...',
    openInMaps: 'Abrir no Google Maps',
    useInSession: 'Usar nesta recarga',
    liveStatusActive: 'GPS em tempo real ativo',
    gpsDeniedHint: 'Permita o GPS no navegador ou digite sua cidade acima para buscar os postos próximos.',
    missingKeyTitle: 'Chave do Google Maps não configurada neste servidor',
    missingKeyBody:
      'Adicione VITE_GOOGLE_MAPS_API_KEY ou GOOGLE_MAPS_API_KEY no arquivo .env para ativar o mapa ao vivo.',
    yourLocation: 'Sua posição atual',
    availableLabel: 'livres',
    portsLabel: 'vagas',
    routeBannerTitle: 'Rota ao vivo até',
    clearRoute: 'Limpar rota',
  },
  en: {
    title: 'Real-Time EV Charger Locator',
    subtitle:
      'Find the nearest live EV charging stations via Google Maps, filter by kW/connector, and calculate driving routes.',
    locateNow: 'Use my GPS now',
    liveTrackingOn: 'Live tracking ON',
    liveTrackingOff: 'Track in real time',
    searchPlaceholder: 'Search city, highway, or address...',
    searchButton: 'Search',
    radiusLabel: 'Radius',
    powerFilterAll: 'All speeds',
    powerFilterFast: 'Fast (50+ kW)',
    powerFilterUltra: 'Ultra (150+ kW)',
    connectorAll: 'All connectors',
    searching: 'Searching live EV stations...',
    stationsFound: 'stations found',
    noStations: 'No EV stations found within this radius or filter. Try 30 km or 50 km.',
    traceRoute: 'Show route',
    calculatingRoute: 'Calculating route...',
    openInMaps: 'Open in Google Maps',
    useInSession: 'Log charge here',
    liveStatusActive: 'Live GPS tracking active',
    gpsDeniedHint: 'Allow browser GPS or enter a city/address above to find nearby chargers.',
    missingKeyTitle: 'Google Maps key not configured on this server',
    missingKeyBody:
      'Set VITE_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY in .env to enable the live map.',
    yourLocation: 'Your current position',
    availableLabel: 'free',
    portsLabel: 'ports',
    routeBannerTitle: 'Live route to',
    clearRoute: 'Clear route',
  },
  es: {
    title: 'Localizador de Cargadores en Tiempo Real',
    subtitle:
      'Encuentra electrolineras cercanas en tiempo real con Google Maps, filtra por potencia/conector y traza la ruta.',
    locateNow: 'Usar mi GPS ahora',
    liveTrackingOn: 'Tiempo real activo',
    liveTrackingOff: 'Seguir en tiempo real',
    searchPlaceholder: 'Buscar ciudad, autopista o dirección...',
    searchButton: 'Buscar',
    radiusLabel: 'Radio',
    powerFilterAll: 'Todas potencias',
    powerFilterFast: 'Rápida (50+ kW)',
    powerFilterUltra: 'Ultra (150+ kW)',
    connectorAll: 'Todos conectores',
    searching: 'Buscando estaciones de carga en vivo...',
    stationsFound: 'estaciones encontradas',
    noStations: 'No se encontraron estaciones con este filtro o radio. Prueba ampliar a 30 km o 50 km.',
    traceRoute: 'Trazar ruta',
    calculatingRoute: 'Calculando ruta...',
    openInMaps: 'Abrir en Google Maps',
    useInSession: 'Usar en carga',
    liveStatusActive: 'GPS en tiempo real activo',
    gpsDeniedHint: 'Permite el GPS o escribe tu ciudad arriba para localizar cargadores.',
    missingKeyTitle: 'Clave de Google Maps no configurada',
    missingKeyBody:
      'Configura VITE_GOOGLE_MAPS_API_KEY o GOOGLE_MAPS_API_KEY en .env para activar el mapa.',
    yourLocation: 'Tu ubicación actual',
    availableLabel: 'libres',
    portsLabel: 'tomas',
    routeBannerTitle: 'Ruta en vivo hacia',
    clearRoute: 'Limpiar ruta',
  },
  de: {
    title: 'Echtzeit-Ladestationen-Finder',
    subtitle:
      'Finde nächste Ladestationen live via Google Maps, filtere nach kW/Stecker und plane die Route.',
    locateNow: 'GPS jetzt nutzen',
    liveTrackingOn: 'Live-Tracking EIN',
    liveTrackingOff: 'Echtzeit-Tracking',
    searchPlaceholder: 'Stadt, Autobahn oder Adresse suchen...',
    searchButton: 'Suchen',
    radiusLabel: 'Radius',
    powerFilterAll: 'Alle Leistungen',
    powerFilterFast: 'Schnell (50+ kW)',
    powerFilterUltra: 'Ultra (150+ kW)',
    connectorAll: 'Alle Stecker',
    searching: 'Suche Live-Ladestationen...',
    stationsFound: 'Ladestationen gefunden',
    noStations: 'Keine Ladestationen im gewählten Radius gefunden. Erhöhe den Radius auf 30–50 km.',
    traceRoute: 'Route anzeigen',
    calculatingRoute: 'Route wird berechnet...',
    openInMaps: 'In Google Maps öffnen',
    useInSession: 'Für Ladevorgang wählen',
    liveStatusActive: 'Live-GPS aktiv',
    gpsDeniedHint: 'GPS freigeben oder oben eine Stadt/Adresse eingeben.',
    missingKeyTitle: 'Google Maps API-Schlüssel fehlt',
    missingKeyBody: 'Hinterlege VITE_GOOGLE_MAPS_API_KEY oder GOOGLE_MAPS_API_KEY in .env.',
    yourLocation: 'Aktuelle Position',
    availableLabel: 'frei',
    portsLabel: 'Ladepunkte',
    routeBannerTitle: 'Live-Route nach',
    clearRoute: 'Route löschen',
  },
  fr: {
    title: 'Localisateur de Bornes en Temps Réel',
    subtitle:
      'Trouvez les bornes de recharge proches en direct via Google Maps, filtrez par puissance/prise et tracez l’itinéraire.',
    locateNow: 'Utiliser mon GPS',
    liveTrackingOn: 'Suivi direct ACTIF',
    liveTrackingOff: 'Suivre en temps réel',
    searchPlaceholder: 'Rechercher ville, route ou adresse...',
    searchButton: 'Rechercher',
    radiusLabel: 'Rayon',
    powerFilterAll: 'Toutes puissances',
    powerFilterFast: 'Rapide (50+ kW)',
    powerFilterUltra: 'Ultra (150+ kW)',
    connectorAll: 'Tous connecteurs',
    searching: 'Recherche des bornes en direct...',
    stationsFound: 'stations trouvées',
    noStations: 'Aucune borne trouvée dans ce rayon. Essayez 30 km ou 50 km.',
    traceRoute: 'Tracer l’itinéraire',
    calculatingRoute: 'Calcul en cours...',
    openInMaps: 'Ouvrir dans Google Maps',
    useInSession: 'Utiliser pour recharge',
    liveStatusActive: 'GPS en temps réel actif',
    gpsDeniedHint: 'Autorisez le GPS ou saisissez une ville/adresse ci-dessus.',
    missingKeyTitle: 'Clé Google Maps non configurée',
    missingKeyBody: 'Définissez VITE_GOOGLE_MAPS_API_KEY ou GOOGLE_MAPS_API_KEY dans .env.',
    yourLocation: 'Votre position actuelle',
    availableLabel: 'libres',
    portsLabel: 'prises',
    routeBannerTitle: 'Itinéraire en direct vers',
    clearRoute: 'Effacer',
  },
};

const DEFAULT_FALLBACK_CENTER: LatLngLiteral = { lat: -23.55052, lng: -46.633308 };

const CONNECTOR_LABELS: Record<string, string> = {
  CCS_COMBO_2: 'CCS2',
  CCS_COMBO_1: 'CCS1',
  TYPE_2: 'Tipo 2',
  CHADEMO: 'CHAdeMO',
  J1772: 'J1772 (Tipo 1)',
  NACS: 'NACS',
  TESLA: 'Tesla',
  UNSPECIFIED_GB_T: 'GB/T',
  UNSPECIFIED_WALL_OUTLET: 'Tomada AC',
  OTHER: 'Outro',
};

function isQuotaError(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : JSON.stringify(err ?? '');
  return (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('OVER_QUERY_LIMIT') ||
    message.includes('OverQuotaMapError') ||
    message.includes('QuotaExceededError') ||
    message.includes('429')
  );
}

function haversineMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function buildFallbackMapsUri(name: string, loc: LatLngLiteral): string {
  const q = encodeURIComponent(`${name} ${loc.lat},${loc.lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function buildFallbackDirectionsUri(loc: LatLngLiteral): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}&travelmode=driving`;
}

interface StationMarkerProps {
  station: ChargerStationItem;
  isSelected: boolean;
  onSelect: (station: ChargerStationItem, marker: google.maps.marker.AdvancedMarkerElement | null) => void;
}

function StationMarker({ station, isSelected, onSelect }: StationMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isFast = station.maxPowerKw >= 50;
  const background = isSelected
    ? '#f59e0b'
    : isFast
    ? '#059669'
    : '#2563eb';
  const borderColor = isSelected ? '#b45309' : isFast ? '#065f46' : '#1e40af';

  return (
    <AdvancedMarker
      ref={markerRef}
      position={station.location}
      title={station.name}
      onClick={() => onSelect(station, marker)}
    >
      <Pin
        background={background}
        borderColor={borderColor}
        glyphColor="#ffffff"
        scale={isSelected ? 1.2 : 1}
      />
    </AdvancedMarker>
  );
}

interface MapRouteOverlayProps {
  route: ActiveRouteSummary | null;
}

function MapRouteOverlay({ route }: MapRouteOverlayProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !route || route.path.length === 0) return;

    const poly = new google.maps.Polyline({
      path: route.path,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.9,
      strokeWeight: 5,
      map,
    });

    const bounds = new google.maps.LatLngBounds();
    for (const point of route.path) {
      bounds.extend(point);
    }
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });

    return () => {
      poly.setMap(null);
    };
  }, [map, route]);

  return null;
}

interface EvLocatorMapWorkspaceProps {
  vehicle: Vehicle;
  prefs: UserPreferences;
  copy: LocatorCopy;
  onSelectStationForLog: (stationName: string) => void;
}

function EvLocatorMapWorkspace({
  prefs,
  copy,
  onSelectStationForLog,
}: EvLocatorMapWorkspaceProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [userLocation, setUserLocation] = useState<LatLngLiteral | null>(null);
  const [searchCenter, setSearchCenter] = useState<LatLngLiteral>(DEFAULT_FALLBACK_CENTER);
  const [liveTracking, setLiveTracking] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);

  const [radiusMeters, setRadiusMeters] = useState<number>(15000);
  const [minKwFilter, setMinKwFilter] = useState<number>(0);
  const [connectorFilter, setConnectorFilter] = useState<string>('ALL');

  const [stations, setStations] = useState<ChargerStationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedStation, setSelectedStation] = useState<ChargerStationItem | null>(null);
  const [selectedAnchor, setSelectedAnchor] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const [activeRoute, setActiveRoute] = useState<ActiveRouteSummary | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const lastFetchedCenterRef = useRef<LatLngLiteral | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const runNearbySearch = useCallback(
    async (center: LatLngLiteral, radius: number) => {
      if (!placesLib) return;
      setIsSearching(true);
      setSearchError(null);

      try {
        const request: google.maps.places.SearchNearbyRequest = {
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'evChargeOptions',
            'googleMapsURI',
            'googleMapsLinks',
            'rating',
          ],
          locationRestriction: {
            center,
            radius,
          },
          includedPrimaryTypes: ['electric_vehicle_charging_station'],
          maxResultCount: 20,
          rankPreference: placesLib.SearchNearbyRankPreference.DISTANCE,
          language: prefs.language,
        };

        const { places } = await placesLib.Place.searchNearby(request);
        lastFetchedCenterRef.current = center;

        const mapped: ChargerStationItem[] = places
          .filter((p) => p.location != null)
          .map((p) => {
            const loc: LatLngLiteral = {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            };
            const name = p.displayName?.trim() || 'Eletroposto EV';
            const address = p.formattedAddress?.trim() || '';
            const aggs = p.evChargeOptions?.connectorAggregations ?? [];
            const connectors: ConnectorSummary[] = aggs.map((agg) => {
              const typeKey = agg.type ?? 'OTHER';
              return {
                type: typeKey,
                label: CONNECTOR_LABELS[typeKey] ?? typeKey,
                count: agg.count ?? 0,
                availableCount: agg.availableCount ?? null,
                maxChargeRateKw: Math.round(agg.maxChargeRateKw ?? 0),
              };
            });

            const maxPowerKw = connectors.reduce(
              (best, c) => Math.max(best, c.maxChargeRateKw),
              0
            );
            const totalConnectors =
              p.evChargeOptions?.connectorCount ??
              connectors.reduce((sum, c) => sum + c.count, 0);
            const hasAvailabilityData = connectors.some((c) => c.availableCount !== null);
            const availableConnectors = hasAvailabilityData
              ? connectors.reduce((sum, c) => sum + (c.availableCount ?? 0), 0)
              : null;

            return {
              id: p.id,
              place: p,
              name,
              address,
              location: loc,
              distanceMeters: Math.round(haversineMeters(center, loc)),
              rating: p.rating ?? null,
              googleMapsUri: p.googleMapsURI || buildFallbackMapsUri(name, loc),
              directionsUri:
                p.googleMapsLinks?.directionsURI || buildFallbackDirectionsUri(loc),
              totalConnectors,
              availableConnectors,
              maxPowerKw,
              connectors,
            };
          })
          .sort((a, b) => a.distanceMeters - b.distanceMeters);

        setStations(mapped);
        setSelectedStation((prev) => {
          if (!prev) return null;
          return mapped.find((s) => s.id === prev.id) ?? null;
        });
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSearchError(
          err instanceof Error
            ? err.message
            : 'Erro ao consultar postos de recarga no Google Maps.'
        );
      } finally {
        setIsSearching(false);
      }
    },
    [placesLib, prefs.language]
  );

  // Initial load: check silent geolocation permission or load around active center
  useEffect(() => {
    if (!placesLib) return;
    let active = true;

    const triggerWithCenter = (center: LatLngLiteral, panMap: boolean) => {
      if (!active) return;
      setSearchCenter(center);
      if (panMap && map) {
        map.panTo(center);
      }
      void runNearbySearch(center, radiusMeters);
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (!active) return;
          setUserLocation(coords);
          setGpsStatusMessage(null);
          triggerWithCenter(coords, true);
        },
        () => {
          setGpsStatusMessage(copy.gpsDeniedHint);
          triggerWithCenter(DEFAULT_FALLBACK_CENTER, false);
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
      );
    } else {
      triggerWithCenter(DEFAULT_FALLBACK_CENTER, false);
    }

    return () => {
      active = false;
    };
    // Run once once placesLib becomes ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib]);

  // Refetch when user changes radius selector
  useEffect(() => {
    if (!placesLib || !lastFetchedCenterRef.current) return;
    void runNearbySearch(searchCenter, radiusMeters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusMeters]);

  // Real-time continuous GPS watchPosition
  useEffect(() => {
    if (!liveTracking) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLiveTracking(false);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const nextCoords: LatLngLiteral = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(nextCoords);
        setSearchCenter(nextCoords);
        setGpsStatusMessage(null);

        if (map) {
          map.panTo(nextCoords);
        }

        const prevCenter = lastFetchedCenterRef.current;
        if (!prevCenter || haversineMeters(prevCenter, nextCoords) > 500) {
          void runNearbySearch(nextCoords, radiusMeters);
        }
      },
      () => {
        setGpsStatusMessage(copy.gpsDeniedHint);
        setLiveTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
    watchIdRef.current = id;

    return () => {
      navigator.geolocation.clearWatch(id);
      watchIdRef.current = null;
    };
  }, [liveTracking, map, radiusMeters, runNearbySearch, copy.gpsDeniedHint]);

  const handleLocateNow = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatusMessage(copy.gpsDeniedHint);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setSearchCenter(coords);
        setGpsStatusMessage(null);
        setActiveRoute(null);
        if (map) {
          map.panTo(coords);
          map.setZoom(13);
        }
        void runNearbySearch(coords, radiusMeters);
      },
      () => {
        setGpsStatusMessage(copy.gpsDeniedHint);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Autocomplete suggestions using modern AutocompleteSuggestion + session token
  useEffect(() => {
    if (!placesLib) return;
    const trimmed = addressQuery.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          language: prefs.language,
        });
        if (!cancelled) {
          setSuggestions(res.suggestions.slice(0, 5));
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (!cancelled) setSuggestions([]);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [addressQuery, placesLib, prefs.language]);

  const selectSuggestionPlace = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['location', 'viewport', 'formattedAddress', 'displayName'],
      });
      sessionTokenRef.current = null;
      setSuggestions([]);
      if (place.location) {
        const coords: LatLngLiteral = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        setAddressQuery(place.formattedAddress || place.displayName || addressQuery);
        setSearchCenter(coords);
        setSelectedStation(null);
        setActiveRoute(null);
        if (map) {
          if (place.viewport) {
            map.fitBounds(place.viewport);
          } else {
            map.panTo(coords);
            map.setZoom(13);
          }
        }
        void runNearbySearch(coords, radiusMeters);
      }
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
  };

  const handleManualAddressSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!placesLib || !addressQuery.trim()) return;
    if (suggestions.length > 0) {
      await selectSuggestionPlace(suggestions[0]);
      return;
    }

    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: addressQuery.trim(),
        fields: ['location', 'viewport', 'formattedAddress', 'displayName'],
        maxResultCount: 1,
        language: prefs.language,
      });
      const first = places[0];
      if (first?.location) {
        const coords: LatLngLiteral = {
          lat: first.location.lat(),
          lng: first.location.lng(),
        };
        setSearchCenter(coords);
        setSelectedStation(null);
        setActiveRoute(null);
        if (map) {
          if (first.viewport) {
            map.fitBounds(first.viewport);
          } else {
            map.panTo(coords);
            map.setZoom(13);
          }
        }
        void runNearbySearch(coords, radiusMeters);
      }
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
  };

  const handleComputeRoute = async (station: ChargerStationItem) => {
    if (!routesLib) return;
    const origin = userLocation ?? searchCenter;
    setIsRouting(true);

    try {
      const result = await routesLib.Route.computeRoutes({
        origin,
        destination: station.location,
        travelMode: routesLib.TravelMode.DRIVING,
        fields: ['durationMillis', 'distanceMeters', 'path', 'viewport'],
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      });
      const primary = result.routes?.[0];
      if (primary) {
        const path = (primary.path ?? []).map((p) => ({
          lat: p.lat,
          lng: p.lng,
        }));
        setActiveRoute({
          stationId: station.id,
          stationName: station.name,
          distanceMeters: primary.distanceMeters ?? station.distanceMeters,
          durationSeconds: primary.durationMillis ? Math.round(primary.durationMillis / 1000) : 0,
          path,
        });
      }
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setSearchError(
        err instanceof Error ? err.message : 'Não foi possível calcular a rota ao vivo.'
      );
    } finally {
      setIsRouting(false);
    }
  };

  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      if (minKwFilter > 0 && station.maxPowerKw < minKwFilter) {
        return false;
      }
      if (connectorFilter !== 'ALL') {
        const hasMatch = station.connectors.some((c) => c.type === connectorFilter);
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [stations, minKwFilter, connectorFilter]);

  return (
    <section className="autolife-glass rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Header + Live GPS Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="font-display text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
              {copy.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {copy.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLocateNow}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span>{copy.locateNow}</span>
          </button>

          <button
            type="button"
            onClick={() => setLiveTracking((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
              liveTracking
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${liveTracking ? 'animate-pulse' : ''}`} />
            <span>{liveTracking ? copy.liveTrackingOn : copy.liveTrackingOff}</span>
          </button>
        </div>
      </div>

      {/* Address Search & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-6 relative">
          <form onSubmit={handleManualAddressSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white shrink-0"
            >
              {copy.searchButton}
            </button>
          </form>

          {suggestions.length > 0 && (
            <ul className="absolute z-30 left-0 right-16 mt-1 bg-white dark:bg-[#0c1629] border border-slate-200 dark:border-white/15 rounded-xl shadow-lg divide-y divide-slate-100 dark:divide-white/10 overflow-hidden">
              {suggestions.map((suggestion, idx) => (
                <li key={suggestion.placePrediction?.placeId || idx}>
                  <button
                    type="button"
                    onClick={() => void selectSuggestionPlace(suggestion)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    {suggestion.placePrediction?.text.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label={copy.radiusLabel}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
          >
            <option value={5000}>{copy.radiusLabel}: 5 km</option>
            <option value={15000}>{copy.radiusLabel}: 15 km</option>
            <option value={30000}>{copy.radiusLabel}: 30 km</option>
            <option value={50000}>{copy.radiusLabel}: 50 km</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Potência mínima"
            value={minKwFilter}
            onChange={(e) => setMinKwFilter(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
          >
            <option value={0}>{copy.powerFilterAll}</option>
            <option value={50}>{copy.powerFilterFast}</option>
            <option value={150}>{copy.powerFilterUltra}</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Tipo de conector"
            value={connectorFilter}
            onChange={(e) => setConnectorFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">{copy.connectorAll}</option>
            <option value="CCS_COMBO_2">CCS2 (Combo 2)</option>
            <option value="TYPE_2">Tipo 2 (AC)</option>
            <option value="CHADEMO">CHAdeMO</option>
            <option value="NACS">NACS</option>
            <option value="TESLA">Tesla</option>
          </select>
        </div>
      </div>

      {/* Live Feedback Messages */}
      {(liveTracking || gpsStatusMessage || searchError) && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {liveTracking && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              {copy.liveStatusActive}
            </span>
          )}
          {gpsStatusMessage && (
            <span className="text-slate-500 dark:text-slate-400">{gpsStatusMessage}</span>
          )}
          {searchError && (
            <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {searchError}
            </span>
          )}
        </div>
      )}

      {/* Active Route Summary Banner */}
      {activeRoute && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-sky-200 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-950/35 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-sky-900 dark:text-sky-200">
            <Route className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>
              {copy.routeBannerTitle} <strong>{activeRoute.stationName}</strong>:{' '}
              <span className="font-mono font-semibold tabular-nums">
                {formatDistance(activeRoute.distanceMeters / 1000, prefs.units)}
              </span>{' '}
              ·{' '}
              <span className="font-mono font-semibold tabular-nums">
                {formatDurationSeconds(activeRoute.durationSeconds)}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveRoute(null)}
            className="text-xs font-medium text-sky-700 dark:text-sky-300 underline"
          >
            {copy.clearRoute}
          </button>
        </div>
      )}

      {/* Map + Station List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Google Map */}
        <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 h-[380px] sm:h-[440px] relative">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={searchCenter}
            defaultZoom={13}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
          >
            {userLocation && (
              <AdvancedMarker position={userLocation} title={copy.yourLocation}>
                <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md ring-4 ring-blue-500/30" />
              </AdvancedMarker>
            )}

            {filteredStations.map((station) => (
              <StationMarker
                key={station.id}
                station={station}
                isSelected={selectedStation?.id === station.id}
                onSelect={(st, marker) => {
                  setSelectedStation(st);
                  setSelectedAnchor(marker);
                }}
              />
            ))}

            {selectedStation && selectedAnchor && (
              <InfoWindow
                anchor={selectedAnchor}
                onCloseClick={() => {
                  setSelectedStation(null);
                  setSelectedAnchor(null);
                }}
              >
                <div className="max-w-[240px] p-1 space-y-2 text-slate-900">
                  <div>
                    <div className="font-semibold text-sm leading-snug">
                      {selectedStation.name}
                    </div>
                    {selectedStation.address && (
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {selectedStation.address}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span className="font-semibold text-blue-700">
                      {formatDistance(selectedStation.distanceMeters / 1000, prefs.units)}
                    </span>
                    {selectedStation.maxPowerKw > 0 && (
                      <span className="font-semibold text-emerald-700">
                        {selectedStation.maxPowerKw} kW
                      </span>
                    )}
                    {selectedStation.availableConnectors !== null ? (
                      <span className="text-emerald-700 font-semibold">
                        {selectedStation.availableConnectors}/{selectedStation.totalConnectors}{' '}
                        {copy.availableLabel}
                      </span>
                    ) : selectedStation.totalConnectors > 0 ? (
                      <span className="text-slate-600">
                        {selectedStation.totalConnectors} {copy.portsLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleComputeRoute(selectedStation)}
                      disabled={isRouting}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>{isRouting ? copy.calculatingRoute : copy.traceRoute}</span>
                    </button>

                    <a
                      href={selectedStation.directionsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 text-slate-800 hover:bg-slate-100 text-[11px] font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Maps</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => onSelectStationForLog(selectedStation.name)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium"
                    >
                      <BatteryCharging className="w-3 h-3" />
                      <span>{copy.useInSession}</span>
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}

            <MapRouteOverlay route={activeRoute} />
          </GoogleMap>
        </div>

        {/* Live Sorted Station List */}
        <div className="lg:col-span-5 flex flex-col border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/70 dark:bg-[#081020]/60 h-[380px] sm:h-[440px]">
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c1629]/80 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="tabular-nums">
              {isSearching
                ? copy.searching
                : `${filteredStations.length} ${copy.stationsFound}`}
            </span>
            {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80 dark:divide-white/10">
            {filteredStations.length === 0 && !isSearching ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                {copy.noStations}
              </div>
            ) : (
              filteredStations.map((station) => {
                const isSelected = selectedStation?.id === station.id;
                return (
                  <div
                    key={station.id}
                    className={`p-4 space-y-2 transition-colors ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-sky-950/30'
                        : 'hover:bg-white dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStation(station);
                          if (map) {
                            map.panTo(station.location);
                            map.setZoom(14);
                          }
                        }}
                        className="text-left min-w-0 flex-1"
                      >
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {station.name}
                        </div>
                        {station.address && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {station.address}
                          </div>
                        )}
                      </button>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                          {formatDistance(station.distanceMeters / 1000, prefs.units)}
                        </div>
                        {station.rating !== null && (
                          <div className="inline-flex items-center gap-0.5 text-[11px] font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{station.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connectors + Speed Summary */}
                    {station.connectors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        {station.connectors.map((c, idx) => (
                          <span
                            key={`${station.id}-${c.type}-${idx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 dark:bg-[#081020]/80 border border-slate-200 dark:border-white/10"
                          >
                            <Zap className="w-3 h-3 text-emerald-500" />
                            <span>
                              {c.label}
                              {c.maxChargeRateKw > 0 ? ` · ${c.maxChargeRateKw}kW` : ''}
                              {c.availableCount !== null
                                ? ` · ${c.availableCount}/${c.count}`
                                : c.count > 0
                                ? ` · ${c.count}x`
                                : ''}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleComputeRoute(station)}
                        disabled={isRouting}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium whitespace-nowrap"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>{copy.traceRoute}</span>
                      </button>

                      <a
                        href={station.directionsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-medium whitespace-nowrap"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{copy.openInMaps}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onSelectStationForLog(station.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-medium whitespace-nowrap"
                      >
                        <BatteryCharging className="w-3 h-3" />
                        <span>{copy.useInSession}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function EvChargerLocatorSection({
  vehicle,
  prefs,
  onSelectStationForLog,
}: EvChargerLocatorSectionProps) {
  const copy = LOCATOR_COPY[prefs.language] ?? LOCATOR_COPY.pt;
  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const [mapsApiKey, setMapsApiKey] = useState<string>(envKey);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(!envKey);

  useEffect(() => {
    if (envKey) {
      setMapsApiKey(envKey);
      setLoadingConfig(false);
      return;
    }

    let active = true;
    fetch('/api/maps/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { apiKey?: string } | null) => {
        if (!active) return;
        setMapsApiKey((data?.apiKey ?? '').trim());
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingConfig(false);
      });

    return () => {
      active = false;
    };
  }, [envKey]);

  if (loadingConfig) {
    return (
      <section className="autolife-glass rounded-2xl p-6 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
        <span>{copy.searching}</span>
      </section>
    );
  }

  if (!mapsApiKey) {
    return (
      <section className="autolife-glass !border-amber-200 dark:!border-amber-700/50 rounded-2xl p-6 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{copy.missingKeyTitle}</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {copy.missingKeyBody}
        </p>
      </section>
    );
  }

  return (
    <APIProvider
      apiKey={mapsApiKey}
      language={prefs.language}
      libraries={['places', 'marker', 'routes', 'core']}
    >
      <EvLocatorMapWorkspace
        vehicle={vehicle}
        prefs={prefs}
        copy={copy}
        onSelectStationForLog={onSelectStationForLog}
      />
    </APIProvider>
  );
}
