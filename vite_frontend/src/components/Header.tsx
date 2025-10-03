import { Link, useLocation } from "react-router-dom";
import { Trophy, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const location = useLocation();

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 relative">
      {/* Desktop Left Section */}
      <div className="hidden md:flex items-center space-x-3">
        <Link
          to="/"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <Trophy size={24} weight="fill" className="text-accent" />
          <h1 className="text-xl font-bold text-foreground">NSSPORTSCLUB</h1>
        </Link>
      </div>

      {/* Mobile Centered Logo */}
      <div className="md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Link
          to="/"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <Trophy size={22} weight="fill" className="text-accent" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            NSSPORTSCLUB
          </h1>
        </Link>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-4">
        <nav className="flex items-center space-x-2">
          <Button
            variant={location.pathname === "/" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/">Home</Link>
          </Button>
          <Button
            variant={location.pathname === "/games" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/games">Games</Link>
          </Button>
          <Button
            variant={location.pathname === "/my-bets" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/my-bets">My Bets</Link>
          </Button>
          <Button
            variant={location.pathname === "/account" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/account">
              <User size={16} className="mr-1" />
              Account
            </Link>
          </Button>
        </nav>
      </div>

      {/* Mobile Account Icon - Top Right */}
      <div className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
          <Link to="/account">
            <User
              size={18}
              className="text-muted-foreground hover:text-foreground transition-colors"
            />
          </Link>
        </Button>
      </div>

      {/* Desktop account section spacer for alignment */}
      <div className="hidden md:block w-[120px]"></div>
    </header>
  );
};
