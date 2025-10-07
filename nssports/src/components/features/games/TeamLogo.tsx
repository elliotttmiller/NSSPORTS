import Image from "next/image";
import { cn } from "@/lib/utils";

interface TeamLogoProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TeamLogo({ src, alt, size = 32, className }: TeamLogoProps) {
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
      />
    </div>
  );
}
