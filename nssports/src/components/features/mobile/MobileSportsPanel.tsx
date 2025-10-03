"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, CaretRight } from "@phosphor-icons/react";
import { useNavigation } from "@/context";
import { useIsMobile } from "@/hooks";
import { getSports } from "@/services/api";
import type { Sport } from "@/types";

export function MobileSportsPanel() {
  const { mobilePanel, setMobilePanel } = useNavigation();
  const isMobile = useIsMobile();
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSport, setExpandedSport] = useState<string | null>(null);

  const isOpen = mobilePanel === "navigation";

  useEffect(() => {
    const loadSports = async () => {
      try {
        const data = await getSports();
        setSports(data);
      } catch (error) {
        console.error("Failed to load sports:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadSports();
    }
  }, [isOpen]);

  const handleLeagueClick = (leagueId: string) => {
    setMobilePanel(null);
    router.push(`/games/${leagueId}`);
  };

  const handleClose = () => {
    setMobilePanel(null);
  };

  const toggleSport = (sportId: string) => {
    setExpandedSport(expandedSport === sportId ? null : sportId);
  };

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[98]"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-card border-r border-border z-[99] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Sports & Leagues</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-accent/10 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
                </div>
              ) : sports.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground text-sm">
                    No sports available
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {sports.map((sport) => (
                    <div key={sport.id} className="border-b border-border/50 last:border-b-0">
                      {/* Sport Header */}
                      <button
                        onClick={() => toggleSport(sport.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{sport.icon}</span>
                          <span className="font-medium">{sport.name}</span>
                        </div>
                        <motion.div
                          animate={{ rotate: expandedSport === sport.id ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CaretRight size={16} className="text-muted-foreground" />
                        </motion.div>
                      </button>

                      {/* Leagues */}
                      <AnimatePresence>
                        {expandedSport === sport.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-muted/20"
                          >
                            <div className="py-1">
                              {sport.leagues.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-muted-foreground">
                                  No leagues available
                                </div>
                              ) : (
                                sport.leagues.map((league) => (
                                  <button
                                    key={league.id}
                                    onClick={() => handleLeagueClick(league.id)}
                                    className="w-full text-left px-8 py-2.5 hover:bg-accent/10 transition-colors text-sm"
                                  >
                                    {league.name}
                                  </button>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
