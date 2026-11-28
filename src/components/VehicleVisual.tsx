import { useEffect, useState } from 'react';
import { Vehicle, VehicleAttachment } from '../types/autolife';
import {
  getCachedDynamicVehicleImage,
  getUserVehiclePhotoUrl,
  lookupDynamicVehicleImage,
  resolveVehicleFallbackVisual,
} from '../utils/vehicleVisualResolver';
import { ResilientImage } from './ResilientImage';

interface VehicleVisualProps {
  vehicle: Vehicle;
  attachments?: VehicleAttachment[];
  className?: string;
  alt?: string;
}

export function VehicleVisual({
  vehicle,
  attachments = [],
  className = 'w-full h-full object-cover',
  alt,
}: VehicleVisualProps) {
  const userPhoto = getUserVehiclePhotoUrl(vehicle, attachments);
  const studioFallback = resolveVehicleFallbackVisual(vehicle);
  const vehicleKey = `${vehicle.id}:${vehicle.vehicleType ?? 'car'}:${vehicle.make}:${vehicle.model}`;
  const cachedDynamic = !userPhoto ? getCachedDynamicVehicleImage(vehicle) : undefined;
  const [fetchedDynamic, setFetchedDynamic] = useState<{
    key: string;
    url: string | null;
  } | null>(null);

  useEffect(() => {
    if (userPhoto || cachedDynamic !== undefined) {
      return;
    }

    let active = true;
    void lookupDynamicVehicleImage(vehicle).then((found) => {
      if (active) {
        setFetchedDynamic({ key: vehicleKey, url: found });
      }
    });

    return () => {
      active = false;
    };
  }, [userPhoto, cachedDynamic, vehicle, vehicleKey]);

  const dynamicUrl = !userPhoto
    ? cachedDynamic !== undefined
      ? cachedDynamic
      : fetchedDynamic?.key === vehicleKey
      ? fetchedDynamic.url
      : null
    : null;

  const resolvedSrc = userPhoto || dynamicUrl || studioFallback.src;

  return (
    <ResilientImage
      src={resolvedSrc}
      fallbackSrc={studioFallback.src}
      vehicleType={vehicle.vehicleType ?? 'car'}
      alt={alt || `${vehicle.make} ${vehicle.model} (${vehicle.year})`}
      fallbackTitle={`${vehicle.make} ${vehicle.model}`}
      className={className}
    />
  );
}
