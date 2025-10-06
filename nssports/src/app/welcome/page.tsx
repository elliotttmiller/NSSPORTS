"use client";

import { TrendUp, Trophy, Target } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="bg-background text-foreground">
      <div className="container mx-auto px-6 md:px-8 xl:px-12 py-6 max-w-screen-2xl">
        <div className="space-y-6">
          
          {/* Hero Section */}
          <div className="text-center py-8 md:py-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-4">
              Welcome to NorthStar Sports
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Your premier destination for sports betting. Join thousands of members who trust NorthStar for their betting experience.
            </p>
            <div className="w-32 md:w-48 h-1 bg-accent mx-auto rounded-full mb-8"></div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              {
                icon: <Trophy size={32} className="text-accent" />,
                title: "Live Sports Betting",
                description: "Bet on live games across NBA, NFL, NHL and more with real-time odds."
              },
              {
                icon: <TrendUp size={32} className="text-accent" />,
                title: "Advanced Analytics",
                description: "Make informed decisions with comprehensive statistics and trends."
              },
              {
                icon: <Target size={32} className="text-accent" />,
                title: "Secure Platform",
                description: "Your funds and data are protected with enterprise-grade security."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-card/50 backdrop-blur-sm border border-border/30 ring-1 ring-white/10 rounded-lg shadow-sm p-6 flex flex-col items-center text-center"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center py-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join NorthStar Sports today and start your winning journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="px-8 py-3">
                <Link href="/auth/register">
                  Create Account
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8 py-3">
                <Link href="/auth/login">
                  Login
                </Link>
              </Button>
            </div>
          </div>

          {/* Bottom spacing for mobile */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
