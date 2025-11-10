"use client";

import Link from "next/link";
import Image from "next/image";
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
  CaretRight,
  DotsThree
} from "@phosphor-icons/react/dist/ssr";
import type { Sport } from "@/types";
import { getSports } from "@/services/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/games", label: "Games", icon: GameController },
  { href: "/live", label: "Live", icon: RadioButton },
  { href: "/my-bets", label: "My Bets", icon: ChartLine },
  { href: "/account", label: "Account", icon: User },
];

// Other bet types (same as mobile)
const otherBetTypes = [
  { 
    id: "bet-it-all", 
    name: "Bet It All", 
    description: "Wager all winnings on next bet",
    route: "/bet-it-all"
  },
  { 
    id: "teaser", 
    name: "Teaser", 
    description: "Adjust spreads in your favor",
    route: "/teasers"
  },
  { 
    id: "round-robin", 
    name: "Round Robin", 
    description: "Multiple parlay combinations",
    route: "/round-robin"
  },
  { 
    id: "if-win-only", 
    name: "If Win Only", 
    description: "Conditional bet on win",
    route: "/if-bets"
  },
  { 
    id: "if-win-or-tie", 
    name: "If Win or Tie", 
    description: "Conditional bet on win/tie",
    route: "/if-bets"
  },
  { 
    id: "win-reverse", 
    name: "Win Reverse", 
    description: "Reverse action on win",
    route: "/reverse-bets"
  },
  { 
    id: "action-reverse", 
    name: "Action Reverse", 
    description: "Reverse action regardless",
    route: "/reverse-bets"
  },
  { 
    id: "fill-open", 
    name: "Fill Open", 
    description: "Fill remaining positions",
    route: null // Not implemented yet
  },
];

export function SideNavPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set());
  const [expandedOther, setExpandedOther] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSports = async () => {
      try {
        setError(null);
        const data = await getSports();
        if (!data || !Array.isArray(data)) {
          setError('No sports data received from API');
          setSports([]);
          return;
        }
        setSports(data);
        setExpandedSports(new Set(data.map((sport: Sport) => sport.id)));
      } catch {
        setError('Failed to fetch sports from API');
        setSports([]);
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
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-300 ease-in-out shadow-sm hover:shadow-lg hover:-translate-y-1 hover:scale-[1.04] active:scale-95 focus-within:ring-2 focus-within:ring-accent/40 cursor-pointer",
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

      {/* Other Bet Types Section */}
      <div className="mt-8 space-y-2">
        <button
          className="flex items-center gap-2 px-3 py-2 w-full text-left rounded-md hover:bg-accent/20 transition-colors"
          onClick={() => setExpandedOther(!expandedOther)}
          aria-expanded={expandedOther}
        >
          {expandedOther ? <CaretDown size={16} /> : <CaretRight size={16} />}
          <DotsThree size={20} weight="bold" />
          <span className="font-medium">Other</span>
        </button>
        
        {/* Other bet types dropdown */}
        {expandedOther && (
          <div className="ml-4 space-y-1">
            {otherBetTypes.map((betType) => (
              <button
                key={betType.id}
                onClick={() => {
                  if (betType.route) {
                    router.push(betType.route);
                  } else {
                    toast.info(`${betType.name} coming soon!`, {
                      description: "This bet type is under development",
                      duration: 3000,
                    });
                  }
                }}
                className={cn(
                  "flex flex-col gap-1 px-3 py-2 rounded-md text-sm transition-colors w-full text-left",
                  pathname === betType.route
                    ? "bg-accent/70 text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                )}
              >
                <span className="font-medium">{betType.name}</span>
                <span className="text-xs text-muted-foreground">{betType.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sports Section */}
      <div className="mt-8 space-y-2">
        <h3 className="text-sm font-semibold mb-3 px-3 text-muted-foreground uppercase">
          Sports
        </h3>
        {loading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Loading sports...</div>
        ) : error ? (
          <div className="px-3 py-2 text-sm text-destructive">{error}</div>
        ) : sports.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">No sports available. Please check your database connection.</div>
        ) : (
          sports.map((sport) => {
            const isExpanded = expandedSports.has(sport.id);
            return (
              <div key={sport.id} className="mb-2">
                <button
                  className="flex items-center gap-2 px-3 py-2 w-full text-left rounded-md hover:bg-accent/20 transition-colors"
                  onClick={() => toggleSport(sport.id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
                  <span className="font-medium">{sport.name}</span>
                </button>
                {/* Leagues under this sport */}
                {isExpanded && sport.leagues && sport.leagues.length > 0 && (
                  <div className="ml-4 space-y-1">
                    {sport.leagues.map((league) => (
                      <Link
                        key={league.id}
                        href={`/games/${league.id}`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                          pathname === `/games/${league.id}`
                            ? "bg-accent/70 text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                        )}
                      >
                        {league.logo && (
                          <Image
                            src={league.logo}
                            alt={league.name + ' logo'}
                            width={24}
                            height={24}
                            className="inline-block align-middle mr-2"
                            style={{ objectFit: 'contain' }}
                          />
                        )}
                        <span>{league.name}</span>
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
