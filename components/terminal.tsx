/**
 * Terminal Component
 * Interactive terminal UI for commanding the pixel art generation
 * and handling user authentication flows.
 */
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { AsciiLogo } from './image-ascii-logo';
import { generatePixelArt, downloadPixelArt, markUserAction } from '@/lib/retrodiffusion';
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
  const [hasGeneratedImage, setHasGeneratedImage] = useState<boolean>(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();

  // Available commands
  const commands = {
    clear: 'Clear terminal history',
    generate: 'Generate pixel art (usage: generate <your prompt>) - Limited to 1 generation',
    recent: 'Toggle view of recent generations',
    login: 'Log in or sign up to use Promixel',
    logout: 'Log out of your account',
    exit: 'Exit the application',
  };

  // Check authentication status and generation limit on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Check if the user has already generated an image
      if (user) {
        const hasGenerated = localStorage.getItem(`promixel_generated_${user.id}`);
        if (hasGenerated === 'true') {
          setHasGeneratedImage(true);
        }
      }
    };
    
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      
      // Check generation limit when auth state changes
      if (session?.user) {
        const hasGenerated = localStorage.getItem(`promixel_generated_${session.user.id}`);
        if (hasGenerated === 'true') {
          setHasGeneratedImage(true);
        } else {
          setHasGeneratedImage(false);
        }
      }
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

  // Add state for command suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(-1);

  // Update suggestions when input changes
  useEffect(() => {
    if (input.trim()) {
      const commandSuggestions = Object.keys(commands).filter(cmd => 
        cmd.startsWith(input.trim()) || 
        (input.trim().startsWith('generate ') && cmd === 'generate')
      );
      setSuggestions(commandSuggestions);
    } else {
      setSuggestions([]);
    }
    setSelectedSuggestion(-1);
  }, [input]);

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          if (suggestions[selectedSuggestion] === 'generate' && input.trim() !== 'generate') {
            setInput('generate ');
          } else {
            setInput(suggestions[selectedSuggestion]);
          }
        } else if (suggestions.length > 0) {
          if (suggestions[0] === 'generate' && input.trim() !== 'generate') {
            setInput('generate ');
          } else {
            setInput(suggestions[0]);
          }
        }
      }
    }
  };

  // Process generate command
  const handleGenerate = async (promptText: string) => {
    // Mark this as a user-initiated action
    markUserAction();

    // Prevent empty prompts
    if (!promptText || promptText.trim() === '') {
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: 'Please provide a prompt to generate an image.' 
      }]);
      return;
    }
    
    // Don't allow generation if already loading
    if (loading) {
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: 'Already generating an image. Please wait for the current generation to complete.' 
      }]);
      return;
    }

    // Check if user is logged in
    if (!user) {
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: 'You need to log in before generating images. Please use the login button at the top left corner.' 
      }]);
      return;
    }
    
    // Check if the user has already generated an image (non-premium users)
    if (hasGeneratedImage && (!user?.email?.includes('@premium') && !user?.email?.includes('@admin'))) {
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: 'You have reached your image generation limit. Premium users can generate unlimited images.' 
      }]);
      return;
    }
    
    // Set loading state and update UI
    setLoading(true);
    setImageError('');
    setHistory(prev => [...prev, { 
      type: 'output', 
      content: `Generating pixel art for: "${promptText}"...\nThis may take a few seconds.` 
    }]);
    
    try {
      // Generate the image
      const result = await generatePixelArt(promptText);
      
      if (result.success && result.imageUrl) {
        // Update state on success
        setImageUrl(result.imageUrl);
        setPrompt(promptText);
        setHistory(prev => [...prev, { 
          type: 'output', 
          content: result.pixelArtAscii || 'Pixel art generated successfully!' 
        }]);
        
        // Track that the user has generated an image
        if (!hasGeneratedImage) {
          localStorage.setItem(`promixel_generated_${user.id}`, 'true');
          setHasGeneratedImage(true);
        }
        
        // Add to recent generations
        const newGeneration = {
          prompt: promptText,
          imageUrl: result.imageUrl,
          timestamp: new Date()
        };
        setRecentGenerations(prev => [newGeneration, ...prev].slice(0, 10));
      } else {
        // Handle generation error
        setImageError(result.message || 'Failed to generate image');
        setHistory(prev => [...prev, { 
          type: 'error', 
          content: result.message || 'Failed to generate image' 
        }]);
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('Error generating image:', error);
      setImageError('An unexpected error occurred');
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: 'An unexpected error occurred while generating the image' 
      }]);
    } finally {
      setLoading(false);
    }
  };

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
      // Instead of showing modal, inform user to use the login button
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: 'Please use the login button at the top left corner of the screen.' 
      }]);
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
      const promptText = command.substring('generate '.length).trim();
      await handleGenerate(promptText);
      return;
    }

    // Unknown command
    setHistory(prev => [...prev, { 
      type: 'error', 
      content: `Unknown command: ${command}. Type 'help' for available commands.` 
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
    canvas.width = 400; // Increased from default 256
    canvas.height = 400; // Increased from default 256
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Fill background
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, 400, 400);
      
      // Add error message
      ctx.fillStyle = '#ff3333';
      ctx.font = '24px monospace'; // Increased font size
      ctx.textAlign = 'center';
      ctx.fillText('Image Generation Failed', 200, 160);
      ctx.fillText('Check Console for Details', 200, 200);
      
      // Draw a simple pixel art sad face (larger)
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(140, 240, 30, 30); // Left eye
      ctx.fillRect(230, 240, 30, 30); // Right eye
      ctx.fillRect(140, 300, 120, 15); // Mouth
      
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

  // Add mobile detection but only use for click handling
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // We'll use responsive CSS classes instead of conditional rendering
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check initially
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Focus input on specific events that are mobile-friendly
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle terminal click to focus input on mobile
  const handleTerminalClick = () => {
    if (isMobile) {
      focusInput();
    }
  };

  // Add quick command execution for mobile
  const executeCommand = (cmd: string) => {
    // Set the input and immediately submit if it's a simple command
    setInput(cmd);
    setTimeout(() => {
      const command = cmd.trim();
      
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
        setHistory(prev => [...prev, { 
          type: 'output', 
          content: 'Please use the login button at the top left corner of the screen.' 
        }]);
        return;
      }

      if (command === 'logout') {
        supabase.auth.signOut().then(() => {
          setHistory(prev => [...prev, { type: 'output', content: 'You have been logged out.' }]);
        }).catch(() => {
          setHistory(prev => [...prev, { type: 'error', content: 'Failed to log out.' }]);
        });
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
    }, 10);
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
        <div 
          ref={terminalRef}
          className="flex-1 bg-black/60 text-green-400 font-mono p-3 sm:p-6 overflow-y-auto rounded-t-lg backdrop-blur-sm border border-white/10 pixel-effect pixel-border"
          onClick={handleTerminalClick}
        >
          <AsciiLogo />
          
          <div className="mb-4 sm:mb-6">
            <div className="text-white font-bold mb-3 pixel-effect text-xl sm:text-2xl" style={{ fontFamily: "var(--font-pixel)" }}>Available commands:</div>
            {Object.entries(commands).map(([cmd, desc]) => (
              <div key={cmd} className="text-base sm:text-lg ml-2 sm:ml-4 my-1 sm:my-2">
                <span 
                  className="text-cyan-400 font-bold pixel-effect text-lg sm:text-xl cursor-pointer hover:underline"
                  style={{ fontFamily: "var(--font-pixel)" }}
                  onClick={() => executeCommand(cmd)}
                >{cmd}</span> - <span className="text-gray-300">{desc}</span>
      </div>
            ))}
            <div className="text-base sm:text-lg mt-4 text-amber-300">
              Note: Limited to 1 image generation per user. This limit helps us provide high-quality images to everyone.
            </div>
            
            {user && (
              <div className="text-base sm:text-lg mt-3 text-emerald-400 pixel-effect break-all">
                Logged in as: {user.email}
              </div>
            )}
          </div>

          {/* Command Buttons - Visible on small screens, hidden on larger */}
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6 md:hidden">
            {Object.keys(commands).map(cmd => (
              <button
                key={cmd}
                onClick={() => executeCommand(cmd)}
                className="bg-black/70 px-3 py-2 rounded-md border border-cyan-500/30 text-cyan-400 text-sm"
              >
                {cmd}
              </button>
        ))}
      </div>

          {history.map((entry, i) => (
            <div 
              key={i} 
              className={`whitespace-pre-wrap mb-2 sm:mb-3 ${
                entry.type === 'error' ? 'text-rose-400' : 
                entry.type === 'input' ? 'text-cyan-400' : 'text-emerald-300'
              } ${entry.type === 'input' ? 'font-mono' : ''} text-base sm:text-xl leading-relaxed`}
              style={{ 
                fontFamily: entry.type === 'input' ? 'var(--font-mono, monospace)' : 'var(--font-pixel)'
              }}
            >
              {entry.content}
            </div>
          ))}
          
          {loading && (
            <div className="text-amber-300 animate-pulse text-lg sm:text-xl my-3" style={{ fontFamily: "var(--font-pixel)" }}>
              Processing...
            </div>
          )}
          
          {imageUrl && !loading && (
            <div className="mt-4 sm:mt-6 border border-white/20 bg-black/70 rounded pixel-effect pixel-border w-full">
              <div className="text-sm sm:text-base text-gray-300 p-2 sm:p-3 border-b border-white/10">Generated Image:</div>

              <div className="flex flex-col items-center w-full p-2 sm:p-4">
                {imageError ? (
                  <div className="flex items-center justify-center text-rose-400 text-base sm:text-lg h-48">{imageError}</div>
                ) : (
                  <div className="w-full max-w-2xl mx-auto">
                    <div className="aspect-square relative overflow-hidden rounded-md"
                      style={{
                        border: '2px solid rgba(0, 255, 255, 0.2)',
                        boxShadow: '0 0 10px rgba(0, 255, 255, 0.1)'
                      }}
                    >
                      <img 
                        src={imageUrl} 
                        alt={`Pixel art for: ${prompt}`}
                        className="absolute inset-0 w-full h-full pixel-effect"
                        style={{ 
                          imageRendering: 'pixelated',
                          objectFit: 'contain',
                          backgroundColor: '#111'
                        }}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                      />
                    </div>
                  </div>
                )}
                
                {!imageError && isValidBase64Image(imageUrl) && !imageUrl.includes('text=Credit+Limit+Reached') && (
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 w-full">
                    <button 
                      onClick={handleDownload}
                      className="bg-black/70 hover:bg-black/90 p-2 rounded text-white border border-white/20 flex items-center gap-2"
                      title="Download image"
                      disabled={loading}
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base font-mono">Download</span>
                    </button>
                    <button 
                      onClick={handleOpenImage}
                      className="bg-black/70 hover:bg-black/90 p-2 rounded text-white border border-white/20 flex items-center gap-2"
                      title="Open in new tab"
                      disabled={loading}
                    >
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base font-mono">View Full</span>
                    </button>
                  </div>
                )}
                
                <div className="text-sm sm:text-base text-amber-300 mt-3 text-center w-full">
                  Don't forget to save your pixel art!
                </div>
              </div>
            </div>
          )}

          {/* Recent Generations Section */}
          {showRecent && recentGenerations.length > 0 && (
            <div className="mt-6 sm:mt-8 border border-white/20 p-3 sm:p-5 bg-black/70 rounded pixel-effect pixel-border">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <History className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                <div className="text-cyan-400 text-base sm:text-lg font-bold pixel-effect" style={{ fontFamily: "var(--font-pixel)" }}>Recent Generations:</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                    <div className="p-2 sm:p-3">
                      <div className="text-xs sm:text-sm text-cyan-200 truncate" title={gen.prompt}>
                        {gen.prompt}
                      </div>
                      <div className="flex justify-between items-center mt-1 sm:mt-2">
                        <span className="text-gray-400 text-xs sm:text-sm">{formatTimestamp(gen.timestamp)}</span>
                        <button 
                          onClick={() => window.open(gen.imageUrl, '_blank')}
                          className="text-xs sm:text-sm bg-black/70 hover:bg-black/90 px-2 sm:px-3 py-1 rounded text-white"
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

        {/* Input bar with responsive design */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
            setTimeout(() => focusInput(), 50);
          }}
          className="flex bg-black/80 rounded-b-lg overflow-hidden border-x border-b border-white/10 pixel-effect"
        >
          <span className="p-2 sm:p-3 text-cyan-400 font-mono text-xl sm:text-2xl flex items-center">$</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent text-white font-mono p-2 sm:p-3 focus:outline-none pixel-effect text-lg sm:text-2xl"
            disabled={loading}
            placeholder={loading ? 'Processing...' : 'Type a command...'}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          />
          {input && (
            <button
              type="submit"
              className="px-3 sm:px-4 bg-cyan-600 text-white font-bold"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
            >
              Enter
            </button>
          )}
        </form>
        
        {/* Command Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-black/90 border border-white/10 rounded-md shadow-lg mt-1 overflow-hidden max-h-48 sm:max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div 
                key={suggestion}
                className={`px-2 sm:px-3 py-2 sm:py-2 font-mono text-sm sm:text-base ${
                  index === selectedSuggestion 
                    ? 'bg-cyan-500/20 text-white' 
                    : 'text-gray-300 hover:bg-black/60'
                }`}
          onClick={() => {
                  if (suggestion === 'generate' && input.trim() !== 'generate') {
                    setInput('generate ');
                  } else {
                    setInput(suggestion);
                  }
                  
                  // Execute immediately if it's a simple command
                  if (suggestion !== 'generate') {
                    executeCommand(suggestion);
                  } else {
                    inputRef.current?.focus();
                  }
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
    </div>
    </>
  );
};

// Add default export
export default Terminal;

