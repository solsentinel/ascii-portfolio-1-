"use client"

import React from 'react';

export function AsciiLogo() {
  return (
    <div className="bg-transparent p-2 flex justify-center">
      <div 
        className="text-center text-white mb-4"
        style={{
          fontFamily: 'var(--font-pixel), monospace',
          letterSpacing: '0.1em',
          textShadow: '0 0 5px rgba(0, 255, 0, 0.7), 0 0 10px rgba(0, 255, 0, 0.5)',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          lineHeight: '1.2',
          padding: '1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '4px',
          width: 'fit-content',
          margin: '0 auto',
          transform: 'translateZ(0)',
          animation: 'glow 2s ease-in-out infinite alternate'
        }}
      >
        PROMIXEL
      </div>
      <style jsx>{`
        @keyframes glow {
          from {
            text-shadow: 0 0 5px rgba(0, 255, 0, 0.7), 0 0 10px rgba(0, 255, 0, 0.5);
          }
          to {
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.9), 0 0 20px rgba(0, 255, 0, 0.7), 0 0 30px rgba(0, 255, 0, 0.5);
          }
        }
      `}</style>
    </div>
  );
}

// Keep old name for backward compatibility
export const ImageAsciiLogo = AsciiLogo;

