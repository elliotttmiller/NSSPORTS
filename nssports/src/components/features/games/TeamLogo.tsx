import Image from "next/image";
import { cn } from "@/lib/utils";

interface TeamLogoProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TeamLogo({ src, alt, size = 32, className }: TeamLogoProps) {
  return (
    <div
      className={cn("relative flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        sizes={`${size}px`}
      />
    </div>
  );
}
