"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  House, 
  GameController, 
  ChartLine, 
  User 
} from "@phosphor-icons/react/dist/ssr";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/games", label: "Games", icon: GameController },
  { href: "/my-bets", label: "My Bets", icon: ChartLine },
  { href: "/account", label: "Account", icon: User },
];

export function SideNavPanel() {
  const pathname = usePathname();

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

      {/* Additional Navigation Sections */}
      <div className="mt-8 space-y-2">
        <h3 className="text-sm font-semibold mb-3 px-3 text-muted-foreground uppercase">
          Sports
        </h3>
        {["NBA", "NFL", "NHL"].map((sport) => (
          <Link
            key={sport}
            href={`/games/${sport.toLowerCase()}`}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            {sport}
          </Link>
        ))}
      </div>
    </div>
  );
}
