"use client";

import { ReactNode } from "react";
import { useIsMobile } from "@/hooks";
import { Header } from "./Header";

interface ThreePanelLayoutProps {
  children: ReactNode;
}

export function ThreePanelLayout({ children }: ThreePanelLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      {/* Header - Always visible */}
      <Header />
      
      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <div className="flex relative h-full w-full">
          {/* Center Panel - Main Content */}
          <div className="flex-1 min-w-0 relative overflow-hidden">
            {isMobile ? (
              /* Mobile: Unified scroll container */
              <div 
                className="fixed inset-0 overflow-y-auto seamless-scroll bg-background"
                style={{
                  top: 'calc(4rem + env(safe-area-inset-top))',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  touchAction: 'pan-y',
                }}
              >
                {children}
              </div>
            ) : (
              /* Desktop: Scrollable content with proper header spacing */
              <div className="h-full overflow-y-auto bg-background">
                <div className="min-h-full pt-8 pb-2">
                  {children}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
