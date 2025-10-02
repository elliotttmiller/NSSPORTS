import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// ...existing code...
import { PropCategory } from "@/types";
import { Game } from "@/types";
import { PropCategorySection } from "./PropCategorySection";
import { usePlayerProps } from "@/hooks/usePlayerProps";
import { cn } from "@/lib/utils";
import { SmoothScrollContainer } from "@/components/VirtualScrolling";

interface PlayerPropsContainerProps {
  categories: PropCategory[];
  game: Game;
  isLoading: boolean;
  compact?: boolean;
  className?: string;
  expandedCategories?: Set<string>;
  setExpandedCategories?: (
    value: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;
}

type SortOption = "default" | "alphabetical" | "mostProps" | "popular";
type FilterOption = "all" | "passing" | "rushing" | "receiving" | "scoring";

export function PlayerPropsContainer({
  categories,
  game,
  isLoading,
  compact = false,
  className,
  expandedCategories,
  setExpandedCategories,
}: PlayerPropsContainerProps) {
  const { filterProps } = usePlayerProps(categories);
  // Use lifted state if provided, else fallback to local (for backward compatibility)
  const [localExpandedCategories, localSetExpandedCategories] = useState<
    Set<string>
  >(new Set(["popular"]));
  const expanded = expandedCategories ?? localExpandedCategories;
  const setExpanded = setExpandedCategories ?? localSetExpandedCategories;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy] = useState<SortOption>("default");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  // ...existing code...

  // Apply filters and sorting
  let processedCategories = categories;

  // Apply search filter
  if (searchTerm) {
    processedCategories = filterProps(searchTerm);
  }

  // Apply category filter
  if (filterBy !== "all") {
    processedCategories = processedCategories.filter(
      (category) => category.key === filterBy,
    );
  }

  // Apply sorting - create a local sort function
  const applySorting = (
    cats: PropCategory[],
    sortOption: SortOption,
  ): PropCategory[] => {
    switch (sortOption) {
      case "alphabetical":
        return [...cats].sort((a, b) => a.name.localeCompare(b.name));
      case "mostProps":
        return [...cats].sort((a, b) => b.props.length - a.props.length);
      case "popular":
        return [...cats].sort((a, b) => {
          if (a.key === "popular") return -1;
          if (b.key === "popular") return 1;
          return 0;
        });
      default:
        return cats;
    }
  };

  processedCategories = applySorting(processedCategories, sortBy);

  // Calculate total props from processed categories
  const totalProps = processedCategories.reduce(
    (sum, cat) => sum + cat.props.length,
    0,
  );

  const toggleCategory = useCallback(
    (categoryKey: string) => {
      setExpanded((current) => {
        const newSet = new Set(current);
        if (newSet.has(categoryKey)) {
          newSet.delete(categoryKey);
        } else {
          newSet.add(categoryKey);
        }
        return newSet;
      });
    },
    [setExpanded],
  );

  const expandAll = useCallback(() => {
    setExpanded(new Set(processedCategories.map((cat) => cat.key)));
  }, [processedCategories, setExpanded]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, [setExpanded]);

  if (isLoading) {
    return (
      <Card className={cn("bg-background border-border/20", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="font-semibold text-base text-foreground">
              Player Props
            </h4>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="rounded-full h-7 w-7 border-2 border-muted animate-spin" />
            <span className="ml-3 text-xs text-muted-foreground">
              Loading player props...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (processedCategories.length === 0) {
    const isEmpty = categories.length === 0;
    return (
      <Card className={cn("bg-background border-border/20", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="font-semibold text-base text-foreground">
              Player Props
            </h4>
          </div>
          <div className="text-center py-8">
            <h5 className="font-medium text-foreground mb-2">
              {isEmpty ? "No Player Props Available" : "No Results Found"}
            </h5>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {isEmpty
                ? "Player props for this game are not currently available."
                : searchTerm
                  ? `No props found matching "${searchTerm}".`
                  : "No props match your current filters."}
            </p>
            {!isEmpty && (searchTerm || filterBy !== "all") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setFilterBy("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "bg-background border border-border/20 overflow-hidden",
        className,
      )}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 pb-2 border-b border-border/20 bg-background">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-base text-foreground">
              Player Props
            </h4>
            <span className="text-xs text-muted-foreground">
              {totalProps} props
            </span>
          </div>
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="h-7 px-2 text-xs"
            >
              Expand All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="h-7 px-2 text-xs"
            >
              Collapse All
            </Button>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ml-auto text-xs bg-background border border-border/30 rounded px-2 py-1 focus:border-accent/40"
              style={{ minWidth: 100 }}
            />
          </div>
        </div>
        {/* Categories - now in SmoothScrollContainer */}
        <SmoothScrollContainer
          className={cn("flex-1 p-3 space-y-2", compact && "p-2 max-h-80")}
          showScrollbar={false}
        >
          {processedCategories.map((category) => (
            <PropCategorySection
              key={category.key}
              category={category}
              game={game}
              isExpanded={expanded.has(category.key)}
              onToggle={() => toggleCategory(category.key)}
              compact={compact}
            />
          ))}
        </SmoothScrollContainer>
      </CardContent>
    </Card>
  );
}
