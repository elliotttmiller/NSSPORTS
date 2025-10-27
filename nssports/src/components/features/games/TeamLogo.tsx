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
  const [imageError, setImageError] = useState(false);
  
  // Normalize NHL logo path to match actual filenames, restoring punctuation
  let normalizedSrc = src;
  if (src.startsWith("/logos/nhl/")) {
    // Extract team name from path
    const file = src.replace("/logos/nhl/", "").replace(".svg", "");
    // Attempt to restore correct punctuation (periods, spaces)
    // Replace hyphens with spaces, then capitalize each word
    let teamName = file.replace(/-/g, " ");
    teamName = teamName.replace(/\b([a-z])/g, (m) => m.toUpperCase());
    // Special case: restore period for 'St Louis Blues' and similar
    teamName = teamName.replace(/^St /, "St. ");
    normalizedSrc = `/logos/nhl/${teamName}.svg`;
  }
  
  // Fallback to team initials if image fails to load
  if (imageError) {
    const initials = alt
      .split(' ')
      .filter(word => word.length > 0)
      .slice(0, 3)
      .map(word => word[0])
      .join('')
      .toUpperCase();
    
    return (
      <div
        className={cn("relative flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <span className="text-xs font-bold text-white" style={{ fontSize: size / 3 }}>
          {initials}
        </span>
      </div>
    );
  }
  
  return (
    <div
      className={cn("relative flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={normalizedSrc}
        alt={alt}
        fill
        className="object-contain"
        sizes={`${size}px`}
        onError={() => setImageError(true)}
      />
    </div>
  );
}
