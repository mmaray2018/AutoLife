import { useEffect, useId, useState } from 'react';
import { VehicleType } from '../types/autolife';
import { resolveVehicleColorStyle } from '../utils/vehicleVisualResolver';

interface ResilientImageProps {
  src?: string | null;
  fallbackSrc?: string;
  vehicleType?: VehicleType;
  bodyStyle?: 'sedan' | 'suv' | 'street' | 'trail';
  vehicleColor?: string;
  isEv?: boolean;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

function VehicleGenericIllustration({
  vehicleType = 'car',
  bodyStyle = 'sedan',
  vehicleColor,
  isEv = false,
  alt,
  className = '',
  fallbackTitle,
}: {
  vehicleType?: VehicleType;
  bodyStyle?: 'sedan' | 'suv' | 'street' | 'trail';
  vehicleColor?: string;
  isEv?: boolean;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const paint = resolveVehicleColorStyle(vehicleColor);
  const paintGradId = `paint-${uid}`;
  const floorGradId = `floor-${uid}`;
  const glassGradId = `glass-${uid}`;

  const isMoto = vehicleType === 'motorcycle';
  const isSuv = bodyStyle === 'suv';
  const isTrail = bodyStyle === 'trail';

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0b1528] via-[#091224] to-[#050914] select-none ${className}`}
      role="img"
      aria-label={alt}
      title={fallbackTitle || alt}
    >
      <svg
        viewBox="0 0 360 190"
        className="w-full h-full object-contain"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={paintGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={paint.highlightHex} />
            <stop offset="48%" stopColor={paint.primaryHex} />
            <stop offset="100%" stopColor={paint.shadowHex} />
          </linearGradient>
          <radialGradient id={floorGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={paint.primaryHex} stopOpacity="0.28" />
            <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#050914" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={glassGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.92" />
          </linearGradient>
        </defs>

        {/* Studio ambient ground glow */}
        <ellipse cx="180" cy="154" rx="140" ry="22" fill={`url(#${floorGradId})`} />
        <ellipse cx="180" cy="152" rx="116" ry="8" fill="#020617" opacity="0.82" />

        {isMoto ? (
          isTrail ? (
            /* Trail / Adventure Motorcycle Silhouette (Dynamic Tank & Fairing Paint) */
            <g>
              {/* Exhaust & swingarm */}
              <path
                d="M78 118 L142 122 L156 132 L88 130 Z"
                fill="#334155"
                stroke="#64748b"
                strokeWidth="1"
              />
              {/* Engine block & chassis */}
              <path
                d="M138 92 L206 86 L224 114 L188 134 L144 128 Z"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <circle cx="176" cy="116" r="11" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
              {/* Front forks */}
              <line x1="226" y1="62" x2="262" y2="132" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
              <line x1="232" y1="62" x2="266" y2="132" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
              {/* Windshield */}
              <path d="M222 58 L236 38 L242 56 Z" fill={`url(#${glassGradId})`} stroke="#7dd3fc" strokeWidth="1" />
              {/* Painted Trail Beak / Front Fender & Fuel Tank / Side Fairing */}
              <path
                d="M214 70 L254 74 L268 84 L236 88 L220 96 Z"
                fill={`url(#${paintGradId})`}
                stroke={paint.borderHex}
                strokeWidth="1.2"
              />
              <path
                d="M168 74 C184 62 214 62 228 74 L218 96 L168 94 Z"
                fill={`url(#${paintGradId})`}
                stroke={paint.borderHex}
                strokeWidth="1.4"
              />
              {/* Trail Tail Fairing */}
              <path
                d="M84 82 L134 86 L128 98 L76 92 Z"
                fill={`url(#${paintGradId})`}
                stroke={paint.borderHex}
                strokeWidth="1.2"
              />
              {/* Seat */}
              <path
                d="M112 80 C134 84 152 84 170 76 L168 90 L114 90 Z"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1.2"
              />
              {/* Handlebar */}
              <path d="M212 56 L226 60" stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" />
              {/* LED Headlight */}
              <polygon points="244,68 258,71 254,79 242,76" fill="#e0f2fe" />
              {/* Wheels */}
              <circle cx="96" cy="130" r="28" fill="#090d16" stroke="#1e293b" strokeWidth="7" />
              <circle cx="96" cy="130" r="18" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="96" cy="130" r="7" fill="#94a3b8" />
              <circle cx="264" cy="130" r="29" fill="#090d16" stroke="#1e293b" strokeWidth="6" />
              <circle cx="264" cy="130" r="20" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="264" cy="130" r="7" fill="#94a3b8" />
            </g>
          ) : (
            /* Street / Sport Motorcycle Silhouette (Dynamic Tank, Fender & Tail Paint) */
            <g>
              {/* Exhaust */}
              <path
                d="M84 128 L156 126 L166 136 L82 138 Z"
                fill="#475569"
                stroke="#94a3b8"
                strokeWidth="1"
              />
              {/* Engine & Frame */}
              <path
                d="M142 94 L212 86 L228 116 L186 136 L146 130 Z"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <circle cx="180" cy="118" r="11" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
              {/* Front forks */}
              <line x1="222" y1="66" x2="262" y2="132" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
              {/* Painted Front Fender */}
              <path
                d="M236 106 Q262 98 282 114 L268 118 Q256 110 238 114 Z"
                fill={`url(#${paintGradId})`}
                stroke={paint.borderHex}
                strokeWidth="1"
              />
              {/* Painted Fuel Tank & Sport Cowl */}
              <path
                d="M164 80 C180 66 214 66 234 80 L226 104 L168 100 Z"
                fill={`url(#${paintGradId})`}
                stroke={paint.borderHex}
                strokeWidth="1.5"
              />
              <path
                d="M214 78 L248 80 L236 96 L216 96 Z"
                fill={`url(#${paintGradId})`}
                stroke={paint.borderHex}
                strokeWidth="1.2"
              />
              {/* Painted Tail Section */}
              <path
                d="M86 80 L134 90 L124 100 L80 90 Z"
                fill={`url(#${paintGradId})`}
                stroke={paint.borderHex}
                strokeWidth="1.2"
              />
              {/* Sport Seat */}
              <path
                d="M116 86 C136 90 152 88 166 80 L166 94 L120 96 Z"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1.2"
              />
              {/* Handlebar */}
              <path d="M208 62 L222 66" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" />
              {/* Headlight */}
              <ellipse cx="245" cy="78" rx="6" ry="5" fill="#e0f2fe" />
              {/* Wheels */}
              <circle cx="96" cy="131" r="28" fill="#090d16" stroke="#1e293b" strokeWidth="7" />
              <circle cx="96" cy="131" r="18" fill="none" stroke="#64748b" strokeWidth="2" />
              <circle cx="96" cy="131" r="7" fill="#cbd5e1" />
              <circle cx="262" cy="131" r="28" fill="#090d16" stroke="#1e293b" strokeWidth="7" />
              <circle cx="262" cy="131" r="18" fill="none" stroke="#64748b" strokeWidth="2" />
              <circle cx="262" cy="131" r="7" fill="#cbd5e1" />
            </g>
          )
        ) : isSuv ? (
          /* SUV / Crossover / EV Car Silhouette (Dynamic Body Paint) */
          <g>
            {/* Main Painted SUV Body */}
            <path
              d="M42 126 L46 94 C48 86 58 80 74 78 L112 52 C122 46 142 44 188 44 C226 44 246 50 264 76 L306 84 C320 87 326 96 326 110 L324 128 C324 134 316 138 304 138 L58 138 C46 138 42 133 42 126 Z"
              fill={`url(#${paintGradId})`}
              stroke={paint.borderHex}
              strokeWidth="1.5"
            />
            {/* Lower Rocker / Wheel Arch Cladding */}
            <path
              d="M44 128 L322 128 L320 138 L46 138 Z"
              fill="#0f172a"
            />
            {/* Cabin Windows */}
            <path
              d="M84 78 L116 54 C126 49 144 48 184 48 L220 48 C236 48 248 56 258 76 Z"
              fill={`url(#${glassGradId})`}
              stroke="#1e293b"
              strokeWidth="2"
            />
            {/* B-pillar */}
            <line x1="176" y1="48" x2="174" y2="78" stroke="#0f172a" strokeWidth="4" />
            {/* Body Shoulder Highlight Line */}
            <path
              d="M66 94 L298 92"
              stroke="#ffffff"
              strokeOpacity="0.28"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Headlight & Taillight */}
            <path d="M300 90 L322 94 L320 102 L298 98 Z" fill="#e0f2fe" />
            <path d="M46 92 L62 90 L60 98 L45 100 Z" fill="#ef4444" />
            {isEv && (
              <circle cx="204" cy="108" r="3" fill="#38bdf8" opacity="0.9" />
            )}
            {/* Wheel Arches */}
            <circle cx="100" cy="134" r="27" fill="#050914" />
            <circle cx="266" cy="134" r="27" fill="#050914" />
            {/* Tires & Alloy Rims */}
            <circle cx="100" cy="134" r="22" fill="#090d16" stroke="#1e293b" strokeWidth="6" />
            <circle cx="100" cy="134" r="14" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="100" cy="134" r="5" fill="#cbd5e1" />
            <circle cx="266" cy="134" r="22" fill="#090d16" stroke="#1e293b" strokeWidth="6" />
            <circle cx="266" cy="134" r="14" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="266" cy="134" r="5" fill="#cbd5e1" />
          </g>
        ) : (
          /* Sleek Sedan / Sportback Car Silhouette (Dynamic Body Paint) */
          <g>
            <path
              d="M38 126 L44 100 C48 90 62 84 82 82 L122 54 C138 46 164 44 196 46 C224 48 242 62 258 80 L306 88 C322 91 328 100 326 114 L322 130 C320 136 312 138 300 138 L54 138 C42 138 37 133 38 126 Z"
              fill={`url(#${paintGradId})`}
              stroke={paint.borderHex}
              strokeWidth="1.5"
            />
            {/* Lower trim */}
            <path d="M40 130 L322 130 L318 138 L44 138 Z" fill="#0f172a" />
            {/* Cabin Glass */}
            <path
              d="M96 81 L126 56 C140 50 164 49 192 50 C216 52 232 62 248 80 Z"
              fill={`url(#${glassGradId})`}
              stroke="#1e293b"
              strokeWidth="2"
            />
            <line x1="176" y1="50" x2="174" y2="81" stroke="#0f172a" strokeWidth="3.5" />
            {/* Character crease */}
            <path
              d="M64 98 L298 96"
              stroke="#ffffff"
              strokeOpacity="0.28"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Headlight & Taillight */}
            <path d="M298 94 L322 98 L319 105 L296 101 Z" fill="#e0f2fe" />
            <path d="M44 96 L62 94 L60 101 L42 103 Z" fill="#ef4444" />
            {/* Wheel Arches */}
            <circle cx="98" cy="134" r="26" fill="#050914" />
            <circle cx="266" cy="134" r="26" fill="#050914" />
            {/* Tires & Alloy Rims */}
            <circle cx="98" cy="134" r="21" fill="#090d16" stroke="#1e293b" strokeWidth="6" />
            <circle cx="98" cy="134" r="13" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="98" cy="134" r="5" fill="#cbd5e1" />
            <circle cx="266" cy="134" r="21" fill="#090d16" stroke="#1e293b" strokeWidth="6" />
            <circle cx="266" cy="134" r="13" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="266" cy="134" r="5" fill="#cbd5e1" />
          </g>
        )}
      </svg>
    </div>
  );
}

export function ResilientImage({
  src,
  fallbackSrc,
  vehicleType = 'car',
  bodyStyle = 'sedan',
  vehicleColor,
  isEv = false,
  alt,
  className = '',
  fallbackTitle,
}: ResilientImageProps) {
  const [activeSrc, setActiveSrc] = useState<string | null>(src ?? null);
  const [triedFallback, setTriedFallback] = useState(false);
  const [useVectorFallback, setUseVectorFallback] = useState(!src);

  useEffect(() => {
    setActiveSrc(src ?? null);
    setTriedFallback(false);
    setUseVectorFallback(!src);
  }, [src, fallbackSrc]);

  if (useVectorFallback || !activeSrc) {
    return (
      <VehicleGenericIllustration
        vehicleType={vehicleType}
        bodyStyle={bodyStyle}
        vehicleColor={vehicleColor}
        isEv={isEv}
        alt={alt}
        className={className}
        fallbackTitle={fallbackTitle}
      />
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => {
        if (!triedFallback && fallbackSrc && activeSrc !== fallbackSrc) {
          setTriedFallback(true);
          setActiveSrc(fallbackSrc);
          return;
        }
        setUseVectorFallback(true);
      }}
      className={className}
    />
  );
}
