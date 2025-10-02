import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Game } from "@/types";
import { getGameById } from "@/services/mockApi";
import { formatDateDetailed } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ArrowLeft } from "@phosphor-icons/react";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";
import { toast } from "sonner";

export default function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("main");

  useEffect(() => {
    if (!gameId) return;

    const loadGameData = async () => {
      setLoading(true);
      try {
        const [gameData] = await Promise.all([getGameById(gameId)]);
        setGame(gameData);
      } catch (error) {
        console.error("Failed to load game data:", error);
        toast.error("Failed to load game details");
      } finally {
        setLoading(false);
      }
    };

    loadGameData();
  }, [gameId]);

  // ...existing code...

  if (loading) {
    return <SkeletonLoader type="games" count={1} />;
  }

  if (!game) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="game-detail-not-found"
          className="h-full flex items-center justify-center bg-background"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center px-4">
            <h3 className="text-lg font-medium text-foreground mb-2">
              Game Not Found
            </h3>
            <p className="text-muted-foreground mb-4">
              The requested game could not be found.
            </p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ...existing code...

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`game-detail-${game.id}`}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
        className="h-full flex flex-col overflow-hidden bg-muted/10"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 bg-card border-b border-border"
          style={{
            fontSize: "var(--fluid-lg)",
            borderRadius: "var(--fluid-radius)",
          }}
        >
          <div style={{ padding: "var(--fluid-panel-padding)" }}>
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="hover:bg-secondary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Badge
                variant={game.status === "live" ? "destructive" : "secondary"}
                className={game.status === "live" ? "animate-pulse" : ""}
              >
                {game.status === "live"
                  ? "LIVE"
                  : game.status === "finished"
                    ? "FINAL"
                    : "UPCOMING"}
              </Badge>
            </div>

            {/* Team Matchup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="text-center md:text-right">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {game.awayTeam.shortName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {game.awayTeam.record}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">vs</div>
                <div className="text-sm font-medium text-foreground">
                  {formatDateDetailed(game.startTime)}
                </div>
              </div>

              <div className="text-center md:text-left">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {game.homeTeam.shortName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {game.homeTeam.record}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="h-full flex flex-col"
          >
            <div
              className="flex-shrink-0"
              style={{ padding: "var(--fluid-panel-padding)" }}
            >
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                <TabsTrigger value="main">Main Lines</TabsTrigger>
                <TabsTrigger value="props">Player Props</TabsTrigger>
                <TabsTrigger value="alt" className="hidden lg:block">
                  Alt Lines
                </TabsTrigger>
                <TabsTrigger value="special" className="hidden lg:block">
                  Specials
                </TabsTrigger>
              </TabsList>
            </div>

            <SmoothScrollContainer
              className="flex-1 px-0"
              showScrollbar={false}
            >
              <div
                style={{
                  padding: "var(--fluid-panel-padding)",
                  fontSize: "var(--fluid-base)",
                }}
              >
                <TabsContent value="main" className="mt-0 space-y-6">
                  {/* Main Betting Lines */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Spread */}
                    {/* ...existing code... */}
                  </div>
                </TabsContent>
                <TabsContent value="props" className="mt-0">
                  {/* ...existing code... */}
                </TabsContent>
                <TabsContent value="alt" className="mt-0">
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Alternative lines coming soon...
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="special" className="mt-0">
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Special bets coming soon...
                    </p>
                  </div>
                </TabsContent>
              </div>
            </SmoothScrollContainer>
          </Tabs>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
