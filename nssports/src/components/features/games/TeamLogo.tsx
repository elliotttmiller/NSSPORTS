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

  // Normalize NHL logo path to match actual filenames (which use proper capitalization and spaces)
  let normalizedSrc = src;
  if (src.startsWith("/logos/nhl/")) {
    // Extract team name from kebab-case path
    const fileName = src.replace("/logos/nhl/", "").replace(".svg", "");
    
    // Convert kebab-case to Title Case with spaces
    let teamName = fileName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Special cases for specific teams
    teamName = teamName.replace(/^St /, "St. "); // St. Louis Blues
    teamName = teamName.replace(/Montreal/i, "Montréal"); // Montréal Canadiens (with accent)
    
    normalizedSrc = `/logos/nhl/${teamName}.svg`;
  }
  
  return (
    // Dynamic size required for responsive logo rendering
    <div
      className={cn("relative flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse rounded" />
      )}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10 rounded">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-muted-foreground"
            style={{ width: size * 0.5, height: size * 0.5 }}
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z"/>
          </svg>
        </div>
      ) : (
        <Image
          src={normalizedSrc}
          alt={alt}
          fill
          className={cn(
            "object-contain transition-opacity duration-200",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          sizes={`${size}px`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          priority={false}
          loading="lazy"
        />
      )}
    </div>
  );
}
