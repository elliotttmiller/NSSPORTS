"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default function PWATestPage() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("Checking...");
  const [manifestStatus, setManifestStatus] = useState("Checking...");
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Check iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          setServiceWorkerStatus(`✅ Registered at ${registration.scope}`);
        } else {
          setServiceWorkerStatus("❌ Not registered");
        }
      });
    } else {
      setServiceWorkerStatus("❌ Not supported");
    }

    // Check manifest
    fetch('/manifest.webmanifest')
      .then(res => res.json())
      .then(manifest => {
        setManifestStatus(`✅ Found: ${manifest.name}`);
      })
      .catch(() => {
        setManifestStatus("❌ Not found");
      });
  }, []);

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">PWA Status Check</h1>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Running as PWA:</span>
                  <span className={`font-bold ${isStandalone ? 'text-green-500' : 'text-yellow-500'}`}>
                    {isStandalone ? '✅ YES - Standalone App!' : '⚠️ NO - Browser Mode'}
                  </span>
                </div>
                {!isStandalone && (
                  <p className="text-sm text-muted-foreground mt-2">
                    To test PWA: Tap Share → Add to Home Screen → Then open from home screen icon
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Platform:</span>
                  <span className="font-mono text-sm">{navigator.platform}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>iOS Device:</span>
                  <span className={isIOS ? 'text-green-500' : 'text-muted-foreground'}>
                    {isIOS ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>User Agent:</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {navigator.userAgent.slice(0, 50)}...
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Worker</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{serviceWorkerStatus}</p>
              <button
                onClick={() => {
                  navigator.serviceWorker.register('/sw.js').then(() => {
                    alert('Service Worker registered!');
                    window.location.reload();
                  });
                }}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
              >
                Re-register Service Worker
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manifest</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{manifestStatus}</p>
              <a
                href="/manifest.webmanifest"
                target="_blank"
                className="mt-2 inline-block text-sm text-blue-500 underline"
              >
                View manifest.webmanifest
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Installation Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold mb-1">📱 iOS Safari:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Tap the Share button (square with arrow)</li>
                    <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</li>
                    <li>Tap &ldquo;Add&rdquo; in the top right</li>
                    <li>Close Safari and open the app from your home screen</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold mb-1">🤖 Android Chrome:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Tap the three dots menu</li>
                    <li>Tap &ldquo;Add to Home screen&rdquo; or &ldquo;Install app&rdquo;</li>
                    <li>Tap &ldquo;Add&rdquo; or &ldquo;Install&rdquo;</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {isStandalone && (
            <Card className="border-green-500 bg-green-500/10">
              <CardHeader>
                <CardTitle className="text-green-500">🎉 Success!</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Your app is running in standalone mode! This is the full PWA experience.
                  Notice there&apos;s no browser UI (address bar, navigation buttons).
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
