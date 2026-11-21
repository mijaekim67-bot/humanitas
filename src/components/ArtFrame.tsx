import { useState } from 'react';
import { Film } from 'lucide-react';

interface ArtFrameProps {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
  aspectClass?: string;
}

export function ArtFrame({
  src,
  alt,
  title,
  className = '',
  aspectClass = 'aspect-video',
}: ArtFrameProps) {
  const [hasError, setHasError] = useState(false);

  const showFallback = !src || hasError;

  return (
    <div
      className={`relative overflow-hidden bg-[#EFECE5] border border-stone-200 ${aspectClass} ${className}`}
    >
      {!showFallback ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#F3EFE6] via-[#EAE4D7] to-[#DFD7C6] text-stone-600">
          <Film className="w-7 h-7 mb-2.5 text-stone-500 stroke-[1.5]" />
          <span className="font-serif text-sm font-medium text-stone-700 line-clamp-2 max-w-[24ch]">
            {title || alt}
          </span>
        </div>
      )}
    </div>
  );
}
