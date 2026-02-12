import { ComponentProps, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { LucideIcon } from "lucide-react";

/**
 * MetricCard Component
 * 
 * Standardized metric display card matching the admin dashboard design.
 * Features:
 * - Horizontal layout with icon, value, and label
 * - Consistent sizing: p-2.5, icon 36x36px (w-9 h-9)
 * - Optional trend indicators (up/down/live)
 * - Semantic color support
 * - Touch-optimized with active states
 */

export interface MetricCardProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Main metric value (e.g., "2", "$3,440", "99.98%") */
  value: string | number;
  /** Descriptive label (e.g., "Total Active Players") */
  label: string;
  /** Icon color class (e.g., "text-accent", "text-emerald-600") */
  iconColor?: string;
  /** Icon background color class (e.g., "bg-accent/10", "bg-emerald-500/10") */
  bgColor?: string;
  /** Optional trend indicator */
  trend?: "up" | "down" | "live";
  /** Additional className for the card container */
  className?: string;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  iconColor = "text-accent",
  bgColor = "bg-accent/10",
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card 
      className={cn(
        // Fully fluid responsive base - adapts to container
        "p-2.5 w-full",
        // Hover & interaction effects
        "hover:shadow-md transition-all duration-200",
        // Refined border
        "border-border/50",
        // Touch optimization
        "touch-action-manipulation active:scale-[0.98]",
        // Ensure proper min-width for content
        "min-w-0",
        className
      )}
    >
      <div className="flex items-center gap-2.5 w-full">
        {/* Icon Container - 36x36px with rounded background */}
        <div 
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            bgColor
          )}
        >
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        
        {/* Value & Label - Inline layout with optimal spacing */}
        <div className="flex items-baseline gap-2 flex-1 min-w-0 overflow-hidden">
          <p className="text-base sm:text-lg font-bold text-foreground truncate leading-tight">
            {value}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground/70 truncate leading-tight">
            {label}
          </p>
        </div>
        
        {/* Optional Trend Indicator */}
        {trend && (
          <div 
            className={cn(
              "hidden sm:flex items-center gap-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
              trend === "up" && "bg-emerald-500/10 text-emerald-600",
              trend === "down" && "bg-red-500/10 text-red-600",
              trend === "live" && "bg-emerald-500/10 text-emerald-600"
            )}
          >
            {trend === "up" && <TrendingUp size={10} />}
            {trend === "down" && <TrendingDown size={10} />}
            {trend === "live" && (
              <>
                {/* Animated Pulsing Live Indicator - matching Trending Live Games */}
                <div className="relative flex items-center justify-center">
                  {/* Outer pulsing ring */}
                  <div className="absolute w-3 h-3 bg-emerald-500/30 rounded-full animate-ping" 
                       style={{ animationDuration: '2s' }}></div>
                  {/* Middle glow */}
                  <div className="absolute w-2.5 h-2.5 bg-emerald-500/50 rounded-full blur-sm"></div>
                  {/* Core dot */}
                  <div className="relative w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></div>
                </div>
                <span>LIVE</span>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * MetricCardSection Component
 * 
 * Wrapper for organizing metric cards into sections with consistent headers.
 * Matches the "PLATFORM ACTIVITY", "AGENT PERFORMANCE", "FINANCIAL SUMMARY" layout.
 */

export interface MetricCardSectionProps extends ComponentProps<"div"> {
  /** Section title (e.g., "Platform Activity") */
  title: string;
  /** Grid configuration for metric cards */
  gridCols?: "2" | "3" | "4";
  /** Children should be MetricCard components */
  children: ReactNode;
}

export function MetricCardSection({
  title,
  gridCols = "4",
  children,
  className,
  ...props
}: MetricCardSectionProps) {
  return (
    <div className={cn("space-y-2 w-full", className)} {...props}>
      {/* Section Header - matches screenshot */}
      <h2 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider px-0.5">
        {title}
      </h2>
      
      {/* Fully Responsive Fluid Grid */}
      <div 
        className={cn(
          "grid gap-2.5 w-full auto-rows-fr",
          gridCols === "4" && "grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
          gridCols === "3" && "grid-cols-1 xs:grid-cols-2 lg:grid-cols-3",
          gridCols === "2" && "grid-cols-1 sm:grid-cols-2"
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * SystemHealthItem Component
 * 
 * Compact metric display for system health indicators.
 * Features horizontal layout with status dot.
 */

export interface SystemHealthItemProps {
  label: string;
  value: string;
  status?: "good" | "warning" | "error";
}

export function SystemHealthItem({
  label,
  value,
  status = "good",
}: SystemHealthItemProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div 
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            status === "good" && "bg-emerald-500",
            status === "warning" && "bg-amber-500",
            status === "error" && "bg-red-500"
          )} 
        />
        <span className="text-xs text-muted-foreground/70 truncate">{label}</span>
      </div>
      <span className="text-xs font-semibold text-foreground shrink-0 ml-2">{value}</span>
    </div>
  );
}
