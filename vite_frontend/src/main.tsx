import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import App from "./App";

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="min-h-screen bg-muted/10 text-foreground flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold mb-4 text-destructive">
          Application Error
        </h2>
        <div className="bg-card border rounded-lg p-4 mb-4">
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap overflow-auto">
            {error.message}
          </pre>
        </div>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
