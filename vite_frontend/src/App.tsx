import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { RootLayout } from "@/components/layouts/RootLayout";
import { HomePage } from "@/pages/HomePage";
import { ProgressiveLoader } from "@/components/ProgressiveLoader";
import { LivePage } from "@/pages/LivePage";

// Lazy load non-critical pages for better initial load performance
const GamePage = lazy(() => import("@/pages/GamePage"));
const GameDetailPage = lazy(() => import("@/pages/GameDetailPage"));
const MyBetsPage = lazy(() => import("@/pages/MyBetsPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const OtherPage = lazy(() => import("@/pages/OtherPage"));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-muted/10 text-foreground flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading NSSPORTSCLUB...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="games" element={<GamePage />} />
          <Route path="games/:gameId" element={<GameDetailPage />} />
          <Route path="my-bets" element={<MyBetsPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="other" element={<OtherPage />} />
          <Route path="live" element={<LivePage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
