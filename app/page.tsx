"use client"

import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Terminal from '@/components/terminal';
import BootSequence from '@/components/boot-sequence';
import PixelGallery from '@/components/pixel-gallery';
import Testimonials from '@/components/testimonials';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="max-w-lg w-full border border-red-600 shadow-lg rounded p-6 pixel-border">
        <h2 className="text-red-500 text-xl mb-3 pixel-effect" style={{ fontFamily: "var(--font-pixel)" }}>
          Something went wrong
        </h2>
        <pre className="p-4 rounded text-sm overflow-auto mb-4 max-h-40 text-red-300 bg-red-950/30">
          {error.message}
        </pre>
        <p className="mb-4">
          Try refreshing the page or check your internet connection.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded pixel-effect"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [content, setContent] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    try {
      // Boot sequence
      const timer = setTimeout(() => {
        setBooting(false);
      }, 2500);

      return () => clearTimeout(timer);
    } catch (err) {
      console.error("Error in boot sequence:", err);
      setError(err instanceof Error ? err : new Error("Unknown error during boot"));
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    if (!booting && !error) {
      try {
        setContent(
          <main className="flex min-h-screen flex-col items-center justify-between p-5 md:p-12">
            <Terminal />
            <div className="w-full max-w-6xl mx-auto mt-12 space-y-16">
              <PixelGallery />
              <Testimonials />
            </div>
          </main>
        );
      } catch (err) {
        console.error("Error rendering main content:", err);
        setError(err instanceof Error ? err : new Error("Failed to render application"));
      }
    }
  }, [booting, error]);

  if (error) {
    return <ErrorFallback error={error} resetErrorBoundary={() => {
      setError(null);
      setBooting(true);
      window.location.reload();
    }} />;
  }

  if (booting) {
    return <BootSequence />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        setBooting(true);
        setTimeout(() => setBooting(false), 1000);
      }}
    >
      {content}
    </ErrorBoundary>
  );
}

