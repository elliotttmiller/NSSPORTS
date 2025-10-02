import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SkeletonLoaderProps {
  type: "games" | "navigation" | "betslip";
  count?: number;
}

export const SkeletonLoader = ({ type, count = 3 }: SkeletonLoaderProps) => {
  if (type === "games") {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-8 bg-muted rounded animate-pulse" />
                  <div className="w-1 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-12 h-8 bg-muted rounded animate-pulse" />
                </div>
                <div className="w-20 h-6 bg-muted rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="w-16 h-4 bg-muted rounded animate-pulse" />
                    <div className="space-y-1">
                      <div className="w-full h-8 bg-muted rounded animate-pulse" />
                      <div className="w-full h-8 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === "navigation") {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center space-x-3 p-2">
              <div className="w-6 h-6 bg-muted rounded animate-pulse" />
              <div className="w-20 h-4 bg-muted rounded animate-pulse" />
            </div>
            <div className="ml-8 space-y-1">
              <div className="w-full h-6 bg-muted/50 rounded animate-pulse" />
              <div className="w-3/4 h-6 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "betslip") {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                <div className="w-12 h-4 bg-muted rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-3 bg-muted rounded animate-pulse" />
                  <div className="w-16 h-6 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-3 bg-muted rounded animate-pulse" />
                  <div className="w-14 h-3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return null;
};
