import { useEffect, useState } from 'react';
import { Bike, Car } from 'lucide-react';
import { VehicleType } from '../types/autolife';

interface ResilientImageProps {
  src: string;
  fallbackSrc?: string;
  vehicleType?: VehicleType;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  fallbackSrc,
  vehicleType = 'car',
  alt,
  className = '',
  fallbackTitle,
}: ResilientImageProps) {
  const [activeSrc, setActiveSrc] = useState(src);
  const [triedFallback, setTriedFallback] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setActiveSrc(src);
    setTriedFallback(false);
    setHasError(false);
  }, [src, fallbackSrc]);

  if (hasError || !activeSrc) {
    const FallbackIcon = vehicleType === 'motorcycle' ? Bike : Car;
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-[#091120] text-slate-500 dark:text-slate-400 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <FallbackIcon className="w-8 h-8 mb-1.5 opacity-70" strokeWidth={1.5} />
        {fallbackTitle && (
          <span className="text-xs font-medium text-center line-clamp-2">{fallbackTitle}</span>
        )}
      </div>
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
        setHasError(true);
      }}
      className={className}
    />
  );
}
