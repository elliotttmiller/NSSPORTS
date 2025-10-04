"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card } from "@/components/ui/card";

interface VirtualScrollTestProps {
  itemCount?: number;
  estimatedItemSize?: number;
  containerHeight?: string;
}

export function VirtualScrollTest({ 
  itemCount = 1000, 
  estimatedItemSize = 60,
  containerHeight = "400px"
}: VirtualScrollTestProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemSize,
    overscan: 5,
  });

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Virtual Scroll Test</h3>
      <div className="text-sm text-muted-foreground mb-2">
        Rendering {itemCount} items with virtual scrolling (only visible items are in DOM)
      </div>
      <div
        ref={parentRef}
        className="border border-border rounded overflow-auto"
        style={{
          height: containerHeight,
          contain: 'strict',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="p-4 border-b border-border bg-card hover:bg-accent/50 transition-colors">
                <div className="font-medium">Item #{virtualItem.index + 1}</div>
                <div className="text-sm text-muted-foreground">
                  Virtual position: {virtualItem.start}px - {virtualItem.start + virtualItem.size}px
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Total container height: {virtualizer.getTotalSize()}px | 
        Visible items: {virtualizer.getVirtualItems().length}
      </div>
    </Card>
  );
}
