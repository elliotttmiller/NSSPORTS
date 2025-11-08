import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TeamLogoProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TeamLogo({ src, alt, size = 32, className }: TeamLogoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // If no logo URL provided, show minimal placeholder
  if (!src) {
    return (
      <div
        className={cn("relative shrink-0 flex items-center justify-center bg-muted/5 rounded", className)}
        style={{ width: size, height: size }}
      >
        <div className="w-1/2 h-1/2 bg-muted/20 rounded-full" />
      </div>
    );
  }
  
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      {/* Subtle loading skeleton - only shows while loading */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-linear-to-br from-muted/10 to-muted/5 animate-pulse rounded" />
      )}
      
      {/* Error state - minimal icon */}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/5 rounded">
          <div className="w-1/2 h-1/2 bg-muted/20 rounded-full" />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn(
            "object-contain transition-all duration-300 ease-out",
            isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
          )}
          sizes={`${size}px`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          priority={false}
          unoptimized
          draggable={false}
        />
      )}
    </div>
  );
}
