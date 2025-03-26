"use client"

import React from 'react';

export function AsciiLogo() {
  return (
    <div className="bg-transparent p-4 flex justify-center">
      <div 
        className="text-center text-white mb-6"
        style={{
          fontFamily: 'var(--font-pixel), monospace',
          letterSpacing: '0.1em',
          textShadow: '0 0 5px rgba(0, 255, 0, 0.7), 0 0 10px rgba(0, 255, 0, 0.5)',
          fontSize: 'clamp(3rem, 7vw, 5rem)',
          lineHeight: '1.2',
          padding: '1.5rem',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px',
          width: 'fit-content',
          margin: '0 auto',
          transform: 'translateZ(0)',
          animation: 'glow 2s ease-in-out infinite alternate',
          fontWeight: 'bold'
        }}
      >
        PROMIXEL
      </div>
      <style jsx>{`
        @keyframes glow {
          from {
            text-shadow: 0 0 8px rgba(0, 255, 0, 0.8), 0 0 15px rgba(0, 255, 0, 0.6);
          }
          to {
            text-shadow: 0 0 15px rgba(0, 255, 0, 1), 0 0 30px rgba(0, 255, 0, 0.8), 0 0 45px rgba(0, 255, 0, 0.6);
          }
        }
      `}</style>
    </div>
  );
}

// Keep old name for backward compatibility
export const ImageAsciiLogo = AsciiLogo;

