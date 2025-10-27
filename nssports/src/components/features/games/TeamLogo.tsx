import Image from "next/image";
import { cn } from "@/lib/utils";

interface TeamLogoProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TeamLogo({ src, alt, size = 32, className }: TeamLogoProps) {
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
      <Image
        src={normalizedSrc}
        alt={alt}
        fill
        className="object-contain"
        sizes={`${size}px`}
      />
    </div>
  );
}
