"use client"

import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Terminal from '@/components/terminal';
import BootSequence from '@/components/boot-sequence';
import PixelGallery from '@/components/pixel-gallery';
import Testimonials from '@/components/testimonials';
import Roadmap from '@/components/roadmap';
import CrtToggle from '@/components/crt-toggle';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthModal from '@/components/auth-modal';
import type { User } from "@supabase/supabase-js";

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
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const supabase = createClientComponentClient();

  // Check authentication status on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

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
          <main className="min-h-screen bg-black relative overflow-hidden">
            {/* Background Image */}
            <div
              className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
              style={{
                backgroundImage:
                  'url("https://ideogram.ai/assets/image/lossless/response/sovtfre8Qi6iHyHJ0ZGreg")',
                backgroundPosition: "center center",
                backgroundSize: "cover",
                filter: "contrast(1.05) brightness(0.9)",
              }}
              aria-hidden="true"
            />
            
            {/* Overlay gradient */}
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40 z-0" />
            
            <CrtToggle />

            {/* Login Button at top left */}
            <div className="fixed top-4 left-4 z-30">
              {user ? (
                <div className="flex items-center gap-3 bg-black/80 p-2 rounded-md border border-cyan-500/30 text-sm">
                  <span className="text-emerald-400 font-pixel">
                    {user.email}
                  </span>
                  <button
                    onClick={async () => await supabase.auth.signOut()}
                    className="bg-black/60 hover:bg-black/90 text-rose-400 px-2 py-1 rounded text-xs"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-md shadow-lg pixel-effect"
                >
                  Sign In
                </button>
              )}
            </div>

            <div className="container mx-auto px-4 py-8 min-h-screen relative z-10">
              {user ? (
                <Terminal />
              ) : (
                <div className="w-full max-w-4xl mx-auto h-64 flex items-center justify-center">
                  <div className="text-center p-6 bg-black/80 rounded-lg border border-white/10 pixel-effect pixel-border">
                    <h2 className="text-cyan-400 text-2xl mb-4 pixel-effect" style={{ fontFamily: "var(--font-pixel)" }}>
                      Welcome to Promixel
                    </h2>
                    <p className="text-gray-300 mb-6">
                      Sign in to start generating amazing pixel art
                    </p>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-md pixel-effect"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}
              <div className="w-full max-w-6xl mx-auto mt-12 space-y-16">
                <PixelGallery />
                <Testimonials />
                <Roadmap />
                <div className="pb-10" />
              </div>
            </div>

            <AuthModal 
              show={showAuthModal} 
              onClose={() => setShowAuthModal(false)} 
            />
          </main>
        );
      } catch (err) {
        console.error("Error rendering main content:", err);
        setError(err instanceof Error ? err : new Error("Failed to render application"));
      }
    }
  }, [booting, error, user, showAuthModal, supabase.auth]);

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

