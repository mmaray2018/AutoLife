import { useState } from 'react';
import { Car } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Car className="w-8 h-8 mb-2 opacity-60" strokeWidth={1.5} />
        {fallbackTitle && (
          <span className="text-xs font-medium text-center">{fallbackTitle}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
