import React, { useRef, ReactNode, memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VirtualScrollContainerProps<T> {
  items: T[];
  itemHeight?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  gap?: number;
  overscan?: number;
  scrollBehavior?: "smooth" | "auto";
}

export const VirtualScrollContainer = memo(function VirtualScrollContainer<T>({
  items,
  renderItem,
  className,
  scrollBehavior = "smooth",
}: VirtualScrollContainerProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto professional-scroll", className)}
      style={{
        scrollBehavior,
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
      }}
    >
      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
              ease: [0.4, 0.0, 0.2, 1],
            }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}) as <T>(props: VirtualScrollContainerProps<T>) => React.JSX.Element;

interface SmoothScrollContainerProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  showScrollbar?: boolean;
}

export const SmoothScrollContainer = memo(function SmoothScrollContainer({
  children,
  className,
  maxHeight = "100%",
  showScrollbar = false,
}: SmoothScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollbarClass = showScrollbar
    ? "virtual-scrollbar"
    : "professional-scroll";

  return (
    <div
      ref={scrollRef}
      className={cn("overflow-auto", scrollbarClass, className)}
      style={{
        maxHeight,
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
  {children}
      </motion.div>
    </div>
  );
});

interface InfiniteScrollProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  className?: string;
  threshold?: number;
}

export const InfiniteScrollContainer = memo(function InfiniteScrollContainer<
  T,
>({
  items,
  renderItem,
  loadMore,
  hasMore,
  loading,
  className,
  threshold = 300,
}: InfiniteScrollProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;

    if (
      scrollHeight - scrollTop - clientHeight < threshold &&
      hasMore &&
      !loading
    ) {
      loadMore();
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn("overflow-auto seamless-scroll", className)}
      style={{
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
      }}
    >
      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.02,
              ease: [0.4, 0.0, 0.2, 1],
            }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}

        {loading && hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-4"
          >
            <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
          </motion.div>
        )}
      </div>
    </div>
  );
}) as <T>(props: InfiniteScrollProps<T>) => React.JSX.Element;
