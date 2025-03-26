/**
 * Terminal Component
 * Interactive terminal UI for commanding the pixel art generation
 * and handling user authentication flows.
 */
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { AsciiLogo } from './image-ascii-logo';
import { generatePixelArt, downloadPixelArt } from '@/lib/retrodiffusion';
import { Download, ExternalLink, History } from "lucide-react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthModal from './auth-modal';
import type { User } from "@supabase/supabase-js";

interface RecentGeneration {
  prompt: string;
  imageUrl: string;
  timestamp: Date;
}

export const Terminal = () => {
  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<{ type: 'input' | 'output' | 'error', content: string }[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([]);
  const [showRecent, setShowRecent] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();

  // Available commands
  const commands = {
    clear: 'Clear terminal history',
    generate: 'Generate pixel art (usage: generate <your prompt>)',
    recent: 'Toggle view of recent generations',
    login: 'Log in or sign up to use Promixel',
    logout: 'Log out of your account',
    exit: 'Exit the application',
  };

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

  // Focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Scroll to the bottom when history changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const command = input.trim();
    
    // Don't process empty commands
    if (!command) return;
    
    // Add the command to history
    setHistory(prev => [...prev, { type: 'input', content: `> ${command}` }]);
    setInput('');
    
    // Process commands
    if (command === 'clear') {
      setHistory([]);
      setImageUrl('');
      setPrompt('');
      setImageError('');
      return;
    }
    
    if (command === 'help') {
      const helpOutput = [
        'Available commands:',
        ...Object.entries(commands).map(([cmd, desc]) => `  ${cmd} - ${desc}`),
      ].join('\n');
      setHistory(prev => [...prev, { type: 'output', content: helpOutput }]);
      return;
    }
    
    if (command === 'exit') {
      setHistory(prev => [...prev, { type: 'output', content: 'Goodbye!' }]);
      return;
    }

    if (command === 'login') {
      setShowAuthModal(true);
      setHistory(prev => [...prev, { type: 'output', content: 'Opening login form...' }]);
      return;
    }

    if (command === 'logout') {
      try {
        await supabase.auth.signOut();
        setHistory(prev => [...prev, { type: 'output', content: 'You have been logged out.' }]);
      } catch (error) {
        setHistory(prev => [...prev, { type: 'error', content: 'Failed to log out.' }]);
      }
      return;
    }

    if (command === 'recent') {
      setShowRecent(!showRecent);
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: showRecent ? 'Recent generations hidden.' : 'Showing recent generations.'
      }]);
      return;
    }
    
    if (command.startsWith('generate ')) {
      // Check if user is authenticated
      if (!user) {
        setHistory(prev => [...prev, { 
          type: 'error', 
          content: 'Error: You need to log in to generate images. Type "login" to sign in or create an account.' 
        }]);
        return;
      }
      
      const newPrompt = command.substring('generate '.length).trim();
      if (!newPrompt) {
        setHistory(prev => [...prev, { 
          type: 'error', 
          content: 'Error: Please provide a prompt for the image.' 
        }]);
        return;
      }
      
      setPrompt(newPrompt);
      setLoading(true);
      setImageUrl('');
      setImageError('');
      
      try {
        setHistory(prev => [...prev, { 
          type: 'output', 
          content: `Generating pixel art for: "${newPrompt}"... This may take a few seconds.` 
        }]);
        
        const result = await generatePixelArt(newPrompt);
        
        if (result.message) {
          // Check if the message contains rate limit information
          if (result.message.includes('Credit limit reached')) {
            setHistory(prev => [...prev, { 
              type: 'error', 
              content: result.message || 'Credit limit reached. Please try again later.' 
            }]);
            // Set a placeholder image for rate limit
            if (result.imageUrl) {
              setImageUrl(result.imageUrl);
            }
          } else {
            setHistory(prev => [...prev, { 
              type: 'output', 
              content: result.message || 'Image generated successfully.' 
            }]);
          }
        }
        
        if (result.imageUrl && !result.message?.includes('Credit limit reached')) {
          setImageUrl(result.imageUrl);
          
          // Add to recent generations
          setRecentGenerations(prev => {
            // Limit to 6 most recent
            const newGenerations = [
              { prompt: newPrompt, imageUrl: result.imageUrl, timestamp: new Date() },
              ...prev
            ].slice(0, 6);
            return newGenerations;
          });
          
          setHistory(prev => [...prev, { 
            type: 'output', 
            content: `✓ Pixel art generated!` 
          }]);
        } else if (!result.imageUrl) {
          throw new Error('No image URL in response');
        }
      } catch (error) {
        console.error('Error in generate command:', error);
        setHistory(prev => [...prev, { 
          type: 'error', 
          content: `Error: ${error instanceof Error ? error.message : 'Failed to generate pixel art'}`
        }]);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Unknown command
    setHistory(prev => [...prev, { 
      type: 'error', 
      content: `Unknown command: ${command}`
    }]);
  };

  // Validate if a base64 image is valid
  const isValidBase64Image = (url: string): boolean => {
    if (!url.startsWith('data:image')) return false;
    
    try {
      const base64 = url.split(',')[1];
      if (!base64) return false;
      atob(base64); // This will throw if invalid
      return true;
    } catch (e) {
      console.error('Invalid base64 image:', e);
      return false;
    }
  };

  // Handle image load success
  const handleImageLoad = () => {
    console.log('Image loaded successfully');
    setImageError('');
  };

  // Handle image load error
  const handleImageError = () => {
    console.error('Failed to load image from URL:', imageUrl);
    setImageError('Failed to load image. The generated image URL is invalid or not accessible.');
    
    // Create a fallback image with error message
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Fill background
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, 256, 256);
      
      // Add error message
      ctx.fillStyle = '#ff3333';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Image Generation Failed', 128, 100);
      ctx.fillText('Check Console for Details', 128, 130);
      
      // Draw a simple pixel art sad face
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(90, 160, 20, 20); // Left eye
      ctx.fillRect(150, 160, 20, 20); // Right eye
      ctx.fillRect(90, 200, 80, 10); // Mouth
      
      // Set the canvas as fallback image
      setImageUrl(canvas.toDataURL());
    }
  };

  // Handle download button click
  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const filename = `promixel-${prompt.replace(/\s+/g, '-').toLowerCase() || 'art'}.png`;
      await downloadPixelArt(imageUrl, filename);
      setHistory(prev => [...prev, { type: 'output', content: `Downloaded image as "${filename}"` }]);
    } catch (error) {
      console.error('Error downloading image:', error);
      setHistory(prev => [...prev, { type: 'error', content: 'Failed to download image' }]);
    }
  };

  // Open image in new tab
  const handleOpenImage = () => {
    if (!imageUrl) return;
    window.open(imageUrl, '_blank');
  };

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
        <div 
          ref={terminalRef}
          className="flex-1 bg-black/60 text-green-400 font-mono p-6 overflow-y-auto rounded-t-lg backdrop-blur-sm border border-white/10 pixel-effect pixel-border"
        >
          <AsciiLogo />
          
          <div className="mb-6">
            <div className="text-white font-bold mb-3 pixel-effect text-2xl" style={{ fontFamily: "var(--font-pixel)" }}>Available commands:</div>
            {Object.entries(commands).map(([cmd, desc]) => (
              <div key={cmd} className="text-lg ml-4 my-2">
                <span className="text-cyan-400 font-bold pixel-effect text-xl" style={{ fontFamily: "var(--font-pixel)" }}>{cmd}</span> - <span className="text-gray-300">{desc}</span>
      </div>
            ))}
            <div className="text-lg mt-4 text-amber-300">
              Note: Limited to 10 image generations per hour.
            </div>
            
            {user && (
              <div className="text-lg mt-3 text-emerald-400 pixel-effect">
                Logged in as: {user.email}
              </div>
            )}
          </div>
          
          {history.map((entry, i) => (
            <div 
              key={i} 
              className={`whitespace-pre-wrap mb-3 ${
                entry.type === 'error' ? 'text-rose-400' : 
                entry.type === 'input' ? 'text-cyan-400' : 'text-emerald-300'
              } ${entry.type === 'input' ? 'font-mono' : ''} text-xl leading-relaxed`}
              style={{ 
                fontFamily: entry.type === 'input' ? 'var(--font-mono, monospace)' : 'var(--font-pixel)'
              }}
            >
              {entry.content}
            </div>
          ))}
          
          {loading && (
            <div className="text-amber-300 animate-pulse text-xl my-3" style={{ fontFamily: "var(--font-pixel)" }}>
              Processing...
            </div>
          )}
          
          {imageUrl && !loading && (
            <div className="mt-6 border border-white/20 p-5 bg-black/70 rounded pixel-effect pixel-border">
              <div className="text-base text-gray-300 mb-3">Generated Image:</div>
              <div className="flex flex-col items-center">
                {imageError ? (
                  <div className="flex items-center justify-center text-rose-400 text-lg h-48">{imageError}</div>
                ) : (
                  <div className="relative w-full max-w-md mx-auto">
                    <img 
                      src={imageUrl} 
                      alt={`Pixel art for: ${prompt}`}
                      className="w-full object-contain rounded pixel-effect"
                      style={{ 
                        imageRendering: 'pixelated',
                        minHeight: '240px',
                        maxHeight: '360px'
                      }}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  </div>
                )}
                
                {!imageError && isValidBase64Image(imageUrl) && !imageUrl.includes('text=Credit+Limit+Reached') && (
                  <div className="flex justify-center space-x-6 mt-5 w-full">
                    <button 
                      onClick={handleDownload}
                      className="bg-black/70 hover:bg-black/90 p-3 rounded text-white border border-white/20 flex items-center gap-3"
                      title="Download image"
                      disabled={loading}
                    >
                      <Download className="w-5 h-5" />
                      <span className="text-base font-mono">Download</span>
                    </button>
                    <button 
                      onClick={handleOpenImage}
                      className="bg-black/70 hover:bg-black/90 p-3 rounded text-white border border-white/20 flex items-center gap-3"
                      title="Open in new tab"
                      disabled={loading}
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span className="text-base font-mono">View Full</span>
                    </button>
                  </div>
                )}
                
                <div className="text-base text-amber-300 mt-4 text-center w-full">
                  Don't forget to save your pixel art!
                </div>
              </div>
            </div>
          )}

          {/* Recent Generations Section */}
          {showRecent && recentGenerations.length > 0 && (
            <div className="mt-8 border border-white/20 p-5 bg-black/70 rounded pixel-effect pixel-border">
              <div className="flex items-center gap-3 mb-4">
                <History className="w-6 h-6 text-cyan-400" />
                <div className="text-cyan-400 text-lg font-bold pixel-effect" style={{ fontFamily: "var(--font-pixel)" }}>Recent Generations:</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {recentGenerations.map((gen, index) => (
                  <div key={index} className="border border-white/10 bg-black/50 rounded-md overflow-hidden">
                    <div className="aspect-square relative">
                      <img 
                        src={gen.imageUrl} 
                        alt={gen.prompt}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="p-3">
                      <div className="text-sm text-cyan-200 truncate" title={gen.prompt}>
                        {gen.prompt}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-400 text-sm">{formatTimestamp(gen.timestamp)}</span>
                        <button 
                          onClick={() => window.open(gen.imageUrl, '_blank')}
                          className="text-sm bg-black/70 hover:bg-black/90 px-3 py-1 rounded text-white"
                        >
                          View
                        </button>
                      </div>
                    </div>
          </div>
        ))}
              </div>
            </div>
          )}
      </div>

        <form 
          onSubmit={handleSubmit} 
          className="flex bg-black/80 rounded-b-lg overflow-hidden border-x border-b border-white/10 pixel-effect"
        >
          <span className="p-3 text-cyan-400 font-mono text-2xl">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent text-white font-mono p-3 focus:outline-none pixel-effect text-2xl"
            disabled={loading}
            placeholder={loading ? 'Processing...' : 'Type a command...'}
          />
        </form>
      </div>

      <AuthModal 
        show={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

// Add default export
export default Terminal;

