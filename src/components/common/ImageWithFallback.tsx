import React, { useState } from 'react';
import { Sprout } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  ...props
}) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-stone-100 text-stone-500 border border-stone-200/60 p-4 select-none ${className}`}
        aria-label={alt || 'Produce image'}
      >
        <Sprout className="w-8 h-8 text-emerald-700/60 mb-1" />
        <span className="text-xs font-medium text-stone-600 text-center line-clamp-1">
          {fallbackTitle || alt || 'Farm Produce'}
        </span>
        <span className="text-[10px] text-stone-600">Fresh Harvest</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'Farm Produce'}
      className={className}
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
      loading="lazy"
      {...props}
    />
  );
};
