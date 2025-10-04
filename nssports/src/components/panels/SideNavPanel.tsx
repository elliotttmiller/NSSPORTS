"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  House, 
  GameController, 
  ChartLine, 
  User,
  RadioButton,
  CaretDown,
  CaretRight
} from "@phosphor-icons/react/dist/ssr";
import type { Sport } from "@/types";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/games", label: "Games", icon: GameController },
  { href: "/live", label: "Live", icon: RadioButton },
  { href: "/my-bets", label: "My Bets", icon: ChartLine },
  { href: "/account", label: "Account", icon: User },
];

export function SideNavPanel() {
  const pathname = usePathname();
  const [sports, setSports] = useState<Sport[]>([]);
  const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const response = await fetch('/api/sports');
        const data = await response.json();
        setSports(data);
        // Expand all sports by default
        setExpandedSports(new Set(data.map((sport: Sport) => sport.id)));
      } catch (error) {
        console.error('Failed to fetch sports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSports();
  }, []);

  const toggleSport = (sportId: string) => {
    setExpandedSports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sportId)) {
        newSet.delete(sportId);
      } else {
        newSet.add(sportId);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold mb-4 px-3">Navigation</h2>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon size={20} weight={isActive ? "fill" : "regular"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Sports Section */}
      <div className="mt-8 space-y-2">
        <h3 className="text-sm font-semibold mb-3 px-3 text-muted-foreground uppercase">
          Sports
        </h3>
        {loading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Loading sports...
          </div>
        ) : (
          sports.map((sport) => {
            const isExpanded = expandedSports.has(sport.id);
            const CaretIcon = isExpanded ? CaretDown : CaretRight;
            
            return (
              <div key={sport.id} className="space-y-1">
                {/* Sport Header - Clickable to expand/collapse */}
                <button
                  onClick={() => toggleSport(sport.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>{sport.icon}</span>
                    <span>{sport.name}</span>
                  </span>
                  <CaretIcon size={16} weight="bold" />
                </button>
                
                {/* Leagues under this sport */}
                {isExpanded && sport.leagues && sport.leagues.length > 0 && (
                  <div className="ml-4 space-y-1">
                    {sport.leagues.map((league) => (
                      <Link
                        key={league.id}
                        href={`/games/${league.id}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                          pathname === `/games/${league.id}`
                            ? "bg-accent/70 text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                        )}
                      >
                        {league.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
