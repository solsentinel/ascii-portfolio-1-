"use client"

import React, { useState, useRef, useEffect } from 'react';
import { generatePixelArt, downloadPixelArt, markUserAction } from '@/lib/retrodiffusion';
import { Download, Sparkles, RefreshCw } from "lucide-react";

export default function PixelGenerator() {
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const MIN_GENERATION_INTERVAL = 3000; // 3 seconds cooldown

  // Reference to the image download link
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous states
    setError(null);
    setMessage(null);

    // Check if the prompt is empty
    if (!prompt || prompt.trim() === '') {
      setError('Please enter a prompt to generate pixel art');
      return;
    }

    // Basic prompt guidance for better results
    if (prompt.trim().length < 3) {
      setError('Please enter a more descriptive prompt (at least 3 characters)');
      return;
    }

    // Show tips for better prompts
    if (prompt.trim().length < 5) {
      setMessage('Tip: More descriptive prompts usually give better results');
    }

    // Prevent rapid-fire API calls
    const now = Date.now();
    if (now - lastGenerationTime < MIN_GENERATION_INTERVAL) {
      setError(`Please wait ${Math.ceil((MIN_GENERATION_INTERVAL - (now - lastGenerationTime)) / 1000)} seconds before generating again`);
      return;
    }

    try {
      // Mark this as a user-initiated action to prevent API blocking
      markUserAction();
      
      // Set generation state
      setIsGenerating(true);
      setLastGenerationTime(now);
      setMessage('Generating your pixel art...');
      
      // Call the API
      const result = await generatePixelArt(prompt);
      
      if (result.success) {
        setGeneratedImage(result.imageUrl);
        setMessage(result.message || 'Pixel art generated successfully!');
      } else {
        // Handle specific error types
        if (result.message?.includes('422') || result.message?.includes('Validation Error')) {
          setError('The API had trouble processing your prompt. Try something simpler or more specific.');
        } else if (result.message?.includes('429') || result.message?.includes('limit')) {
          setError('Rate limit reached. Please try again later.');
        } else {
          setError(result.message || 'Failed to generate pixel art. Please try again.');
        }
        
        // Still show any image that might have been returned (like an error image)
        if (result.imageUrl) {
          setGeneratedImage(result.imageUrl);
        }
      }
    } catch (err) {
      console.error('Error generating pixel art:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage && downloadLinkRef.current) {
      downloadPixelArt(prompt, generatedImage);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black bg-opacity-80 rounded-lg border border-cyan-700/50 p-4 shadow-lg pixel-border">
      <h2 className="text-cyan-400 text-xl mb-4 text-center font-pixel">Pixel Art Generator</h2>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt (e.g., pixel cat)"
            className="bg-black bg-opacity-60 border border-cyan-700/30 text-gray-200 px-3 py-2 rounded flex-grow font-mono text-sm focus:outline-none focus:border-cyan-500"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={isGenerating}
            className={`px-4 py-2 rounded ${isGenerating ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600'} text-white flex items-center gap-1`}
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 text-red-300 rounded text-sm">
          {error}
        </div>
      )}

      {message && !error && (
        <div className="mb-4 p-3 bg-emerald-900/40 border border-emerald-500/50 text-emerald-300 rounded text-sm">
          {message}
        </div>
      )}

      {generatedImage && (
        <div className="mt-4">
          <div className="border border-cyan-700/30 rounded-lg overflow-hidden bg-black/50 p-2">
            <img
              src={generatedImage}
              alt={prompt}
              className="w-full object-contain pixel-img"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          
          <div className="flex justify-center mt-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <a ref={downloadLinkRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
} 