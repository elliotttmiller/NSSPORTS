import Image from "next/image";
import { cn } from "@/lib/utils";

interface TeamLogoProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TeamLogo({ src, alt, size = 32, className }: TeamLogoProps) {
  // Normalize NHL logo path to match actual filenames
  let normalizedSrc = src;
  if (src.startsWith("/logos/nhl/")) {
    // Extract team name from path
    const file = src.replace("/logos/nhl/", "").replace(".svg", "");
    // Convert to Title Case and add spaces
    normalizedSrc = `/logos/nhl/${file
      .split("-")
      .map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ")}.svg`;
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
