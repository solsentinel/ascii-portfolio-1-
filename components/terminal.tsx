"use client"

import React, { useState, useRef, useEffect } from 'react';
import { ImageAsciiLogo as AsciiLogo } from './image-ascii-logo';
import { generatePixelArt, downloadPixelArt } from '@/lib/retrodiffusion';
import { Download as IconDownload, RefreshCw as IconRefresh, ExternalLink as IconExternalLink } from "lucide-react";

export const Terminal = () => {
  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<{ type: 'input' | 'output' | 'error', content: string }[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Available commands
  const commands = {
    help: 'Display all available commands',
    clear: 'Clear terminal history',
    generate: 'Generate pixel art (usage: generate <your prompt>)',
    exit: 'Exit the application',
  };

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
    
    if (command.startsWith('generate ')) {
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
      content: `Unknown command: ${command}\nType 'help' for available commands.`
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
    setImageError('Failed to load image. The generated image data may be invalid.');
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

  // Refresh/regenerate the current image
  const handleRefresh = async () => {
    if (!prompt) return;
    
    setLoading(true);
    setImageUrl('');
    setImageError('');
    
    try {
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: `Regenerating pixel art for: "${prompt}"...` 
      }]);
      
      const result = await generatePixelArt(prompt);
      
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
            content: result.message || 'Image regenerated successfully.'
          }]);
        }
      }
      
      if (result.imageUrl && !result.message?.includes('Credit limit reached')) {
        setImageUrl(result.imageUrl);
        setHistory(prev => [...prev, { 
          type: 'output', 
          content: `✓ Pixel art regenerated!`
        }]);
      } else if (!result.imageUrl) {
        throw new Error('No image URL in response');
      }
    } catch (error) {
      console.error('Error regenerating:', error);
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${error instanceof Error ? error.message : 'Failed to regenerate pixel art'}`
        }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
      <div 
        ref={terminalRef}
        className="flex-1 bg-black text-green-400 font-mono p-4 overflow-y-auto rounded-t-lg"
      >
        <AsciiLogo />
        
        <div className="mb-4">
          <div className="text-white font-bold mb-1">Available commands:</div>
          {Object.entries(commands).map(([cmd, desc]) => (
            <div key={cmd} className="text-xs ml-2">
              <span className="text-blue-400 font-bold">{cmd}</span> - {desc}
            </div>
          ))}
          <div className="text-xs mt-2 text-yellow-400">
            Note: Limited to 10 image generations per hour.
          </div>
        </div>
        
        {history.map((entry, i) => (
          <div 
            key={i} 
            className={`whitespace-pre-wrap mb-2 ${
              entry.type === 'error' ? 'text-red-400' : 
              entry.type === 'input' ? 'text-blue-400' : 'text-green-400'
            }`}
          >
            {entry.content}
          </div>
        ))}
        
        {loading && (
          <div className="text-yellow-400 animate-pulse">
            Processing...
          </div>
        )}
        
        {imageUrl && !loading && (
          <div className="mt-4 border border-gray-700 p-2 bg-gray-900 rounded">
            <div className="text-xs text-gray-400 mb-2">Generated Image:</div>
            <div className="relative bg-gray-800 rounded flex justify-center items-center p-2">
              <div className="w-full pb-[100%] relative">
                {imageError ? (
                  <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">{imageError}</div>
                ) : (
                  <img 
                    src={imageUrl} 
                    alt={`Pixel art for: ${prompt}`}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
                
                {!imageError && isValidBase64Image(imageUrl) && !imageUrl.includes('text=Credit+Limit+Reached') && (
                  <div className="absolute bottom-2 right-2 flex space-x-2">
                    <button 
                      onClick={handleDownload}
                      className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-white"
                      title="Download image"
                    >
                      <IconDownload className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleOpenImage}
                      className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-white"
                      title="Open in new tab"
                    >
                      <IconExternalLink className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleRefresh}
                      className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-white"
                      title="Regenerate image"
                    >
                      <IconRefresh className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-xs text-yellow-400 mt-2 text-center w-full">
                Don't forget to save your file!
              </div>
            </div>
          </div>
        )}
      </div>
      
      <form 
        onSubmit={handleSubmit} 
        className="flex bg-gray-800 rounded-b-lg overflow-hidden"
      >
        <span className="p-2 text-green-400 font-mono">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent text-white font-mono p-2 focus:outline-none"
          disabled={loading}
          placeholder={loading ? 'Processing...' : 'Type a command...'}
        />
      </form>
    </div>
  );
};

// Add default export
export default Terminal;

